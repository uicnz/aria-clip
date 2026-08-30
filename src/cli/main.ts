import { Command, CommanderError, Option } from 'commander';
import pc from 'picocolors';
import { z } from 'zod';
import { collectPrompts } from '../features/templates/engine/prompts.js';
import { RunOptsSchema, UrlSchema } from './args.js';
import { loadConfig, ModelRefSchema, paths, setDefaultModel } from './config.js';
import { capabilities, describe, examples, schema } from './discover.js';
import { CodeSchema, EventSchema, type CommandName, type Event } from './schema.js';
import { ERROR_DOCS, fail, failure, Fault } from './fault.js';
import { allHelp, commandHelp, topHelp, topicHelp } from './help.js';
import { interpret } from './interpret.js';
import { ADVANCED_OPTS, COMMANDS, COMMON_OPTS, expand, findCommand, type Cmd, type Opt } from './registry.js';
import { asFault, run } from './run.js';
import { allTemplates, exportTemplate, importTemplate, loadTemplate } from './templates.js';
import { PROTOCOL, VERSION } from './version.js';

const color = process.stderr.isTTY === true && process.env.NO_COLOR === undefined && process.env.TERM !== 'dumb';
const c = pc.createColors(color);

function json(value: object): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function compact(value: object): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}

function commandOptions(command: Command): object {
	const chain: object[] = [];
	for (let current: Command | null = command; current; current = current.parent) {
		chain.unshift(current.opts());
	}
	return Object.assign({}, ...chain);
}

function addOptions(command: Command, options: readonly Opt[]): void {
	for (const meta of options) {
		const option = new Option(meta.flags, meta.description);
		if (meta.choices) option.choices([...meta.choices]);
		command.addOption(option);
	}
}

function event(name: Event['event'], data?: Event['data']): void {
	const value: unknown = data === undefined
		? undefined
		: JSON.parse(JSON.stringify(data));
	compact(EventSchema.parse({
		schemaVersion: PROTOCOL,
		event: name,
		time: new Date().toISOString(),
		data: value === undefined ? undefined : z.json().parse(value),
	}));
}

function humanError(fault: Fault): void {
	process.stderr.write(`${c.red(c.bold('Error'))}: ${fault.detail.message}\n`);
	if (fault.detail.hint) process.stderr.write(`\n${c.bold('Try')}\n  ${fault.detail.hint}\n`);
	process.stderr.write(`\n${c.gray(`Nothing was delivered. Error: ${fault.detail.code}`)}\n`);
}

async function execute(name: CommandName, url: string | undefined, raw: object): Promise<void> {
	const opts = RunOptsSchema.parse(raw);
	const command = findCommand(name);
	if (!command) fail('E_USAGE', `Unknown command ${name}.`, 'input');
	if (opts.explain) {
		const value = expand(command);
		opts.json ? json(value) : process.stdout.write(`${commandHelp(command)}\n\nCanonical\n  ${value.canonical}\n`);
		return;
	}
	if (!url) fail('E_USAGE', `${name} requires a URL.`, 'input', { hint: `Run \`aria-clip ${name} <url>\`.` });
	const parsedUrl = UrlSchema.safeParse(url);
	if (!parsedUrl.success) fail('E_URL_INVALID', `Invalid source URL: ${url}`, 'input', {
		hint: 'Pass a complete HTTP or HTTPS URL.',
	});

	const result = await run({
		command: name,
		url: parsedUrl.data,
		opts,
		emit: opts.jsonl ? event : undefined,
	});
	if (opts.jsonl) return;
	if (opts.json) {
		json(result);
		return;
	}
	if (opts.dryRun) {
		process.stdout.write([
			c.bold('Dry run'),
			`Template: ${result.template.name} (${result.template.id})`,
			`Interpreter: ${result.interpreter.performed ? `${result.interpreter.provider}/${result.interpreter.model}` : 'not contacted'}`,
			`Delivery: ${result.delivery.requested} (not performed)`,
		].join('\n') + '\n');
		return;
	}
	if (result.delivery.requested === 'stdout') {
		process.stdout.write(result.artifact.markdown);
	} else if (result.delivery.requested === 'file') {
		process.stderr.write(`${c.green('Saved')} ${result.delivery.path}\n`);
	} else {
		process.stderr.write(`${c.green('Added to Aria')} ${result.delivery.identity ?? ''}${result.delivery.destination ? ` → ${result.delivery.destination}` : ''}\n`);
	}
}

function addRun(program: Command, definition: Cmd): void {
	const command = program
		.command(`${definition.name} [url]`)
		.description(definition.summary)
		.helpOption(false)
		.allowExcessArguments(false);
	addOptions(command, [...COMMON_OPTS, ...ADVANCED_OPTS]);
	command.action(async (url: string | undefined, _raw: object, active: Command) => execute(definition.name, url, commandOptions(active)));
}

function addCommand(program: Command, name: CommandName, syntax = '', options = true): Command {
	const definition = findCommand(name);
	if (!definition) throw new Error(`Command registry is missing ${name}.`);
	const command = program
		.command(`${definition.name}${syntax ? ` ${syntax}` : ''}`)
		.description(definition.summary)
		.helpOption(false);
	if (options) addOptions(command, definition.opts);
	return command;
}

function discovery(program: Command): void {
	addCommand(program, 'help', '[topic]').action((topic?: string) => {
		const output = topic ? topicHelp(topic) : topHelp();
		if (!output) fail('E_USAGE', `Unknown help topic ${topic}.`, 'input', {
			hint: 'Try `aria-clip help agent` or `aria-clip --help`.',
		});
		process.stdout.write(`${output}\n`);
	});

	addCommand(program, 'describe', '[name]').action((name: string | undefined, _raw: object, active: Command) => {
		const doc = describe(name);
		const command = name ? findCommand(name) : undefined;
		const opts = z.strictObject({ json: z.boolean().default(false) }).parse(commandOptions(active));
		opts.json ? json(doc) : process.stdout.write(command ? `${commandHelp(command)}\n` : `${allHelp()}\n`);
	});

	addCommand(program, 'schema', '<name>').action((name: string) => json(schema(name)));
	addCommand(program, 'examples').action((_raw: object, active: Command) => {
		const values = examples();
		const opts = z.strictObject({ json: z.boolean().default(false) }).parse(commandOptions(active));
		opts.json ? json({ schemaVersion: PROTOCOL, examples: values }) : process.stdout.write(`${values.join('\n')}\n`);
	});

	addCommand(program, 'capabilities').action(async (_raw: object, active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const value = await capabilities(opts.config);
		if (opts.json) json(value);
		else process.stdout.write([
			`${c.bold('Aria Clip')} ${value.version}`,
			`Runtime: ${value.runtime.name} ${value.runtime.version} on ${value.runtime.platform}`,
			`Templates: ${value.templates.length}`,
			`Aria: ${value.aria.available ? value.aria.version : 'unavailable'}`,
			`Config: ${value.paths.config}`,
		].join('\n') + '\n');
	});

	addCommand(program, 'doctor').action(async (_raw: object, active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const value = await capabilities(opts.config);
		const checks = [
			{ name: 'runtime', ok: true, detail: `${value.runtime.name} ${value.runtime.version}` },
			{ name: 'templates', ok: value.templates.length > 0, detail: `${value.templates.length} available` },
			{ name: 'aria', ok: value.aria.available, detail: value.aria.version ?? 'not installed' },
			{ name: 'model', ok: value.defaultModel !== null, detail: value.defaultModel ?? 'not configured' },
		];
		if (opts.json) json({ schemaVersion: PROTOCOL, ok: checks.every(check => check.ok), checks });
		else process.stdout.write(checks.map(check => `${check.ok ? c.green('ok') : c.yellow('--')}  ${check.name.padEnd(10)} ${c.gray(check.detail)}`).join('\n') + '\n');
	});

	const templates = addCommand(program, 'templates');
	const listTemplates = async (active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const items = await allTemplates(opts.config);
		const docs = items.map(template => ({
			id: template.id,
			name: template.name,
			artifact: template.artifactType ?? null,
			triggers: template.triggers ?? [],
			interprets: collectPrompts(template).length > 0,
		}));
		opts.json ? json({ schemaVersion: PROTOCOL, templates: docs }) : process.stdout.write(`${docs.map(item => `${item.id.padEnd(28)} ${item.name}`).join('\n')}\n`);
	};
	templates.action((_raw: object, active: Command) => listTemplates(active));
	templates.command('list').option('--json').option('--config <path>').helpOption(false).action((_raw: object, active: Command) => listTemplates(active));
	templates.command('show <id>').option('--json').option('--config <path>').helpOption(false).action(async (id: string, _raw: object, active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const template = (await allTemplates(opts.config)).find(item => item.id === id);
		if (!template) fail('E_TEMPLATE_NOT_FOUND', `Template ${id} was not found.`, 'input');
		opts.json ? json(template) : process.stdout.write(`${JSON.stringify(template, null, 2)}\n`);
	});
	templates.command('validate <path>').option('--json').helpOption(false).action(async (path: string, _raw: object, active: Command) => {
		const template = await loadTemplate(path);
		const value = { schemaVersion: PROTOCOL, ok: true, id: template.id, name: template.name };
		const opts = z.strictObject({ json: z.boolean().default(false) }).parse(commandOptions(active));
		opts.json ? json(value) : process.stdout.write(`${c.green('Valid')} ${template.name} (${template.id})\n`);
	});
	templates.command('match <url>')
		.option('--json')
		.option('--config <path>')
		.option('--timeout <ms>')
		.option('--max-bytes <count>')
		.option('--allow-private-network')
		.helpOption(false)
		.action(async (url: string, _raw: object, active: Command) => {
			const raw = z.strictObject({
				json: z.boolean().default(false),
				config: z.string().optional(),
				timeout: z.string().optional(),
				maxBytes: z.string().optional(),
				allowPrivateNetwork: z.boolean().default(false),
			}).parse(commandOptions(active));
			const opts = RunOptsSchema.parse({
				config: raw.config,
				timeout: raw.timeout,
				maxBytes: raw.maxBytes,
				allowPrivateNetwork: raw.allowPrivateNetwork,
				dryRun: true,
			});
			const result = await run({ command: 'auto', url: UrlSchema.parse(url), opts });
			const value = { schemaVersion: PROTOCOL, template: result.template };
			raw.json ? json(value) : process.stdout.write(`${result.template.id}\t${result.template.name}\n`);
		});
	templates.command('import <path>')
		.option('--json')
		.option('--config <path>')
		.option('--overwrite')
		.helpOption(false)
		.action(async (path: string, _raw: object, active: Command) => {
			const opts = z.strictObject({
				json: z.boolean().default(false),
				config: z.string().optional(),
				overwrite: z.boolean().default(false),
			}).parse(commandOptions(active));
			const output = await importTemplate(path, opts.config, opts.overwrite);
			const value = { schemaVersion: PROTOCOL, ok: true, path: output };
			opts.json ? json(value) : process.stdout.write(`${c.green('Imported')} ${output}\n`);
		});
	templates.command('export <id>')
		.option('--config <path>')
		.helpOption(false)
		.action(async (id: string, _raw: object, active: Command) => {
			const opts = z.strictObject({ config: z.string().optional() }).parse(commandOptions(active));
			process.stdout.write(await exportTemplate(id, opts.config));
		});

	const config = addCommand(program, 'config', '', false);
	config.command('path').option('--config <path>').helpOption(false).action((_raw: object, active: Command) => {
		const opts = z.strictObject({ config: z.string().optional() }).parse(commandOptions(active));
		process.stdout.write(`${paths(opts.config).config}\n`);
	});
	config.command('show').option('--json').option('--config <path>').helpOption(false).action(async (_raw: object, active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const value = await loadConfig(opts.config);
		const safe = {
			...value,
			providers: Object.fromEntries(Object.entries(value.providers).map(([id, provider]) => [id, {
				...provider,
				credential: provider.keyEnv ? Boolean(process.env[provider.keyEnv]) : true,
			}])),
		};
		opts.json ? json(safe) : process.stdout.write(`${JSON.stringify(safe, null, 2)}\n`);
	});
	config.command('set <key> <value>').option('--config <path>').helpOption(false).action(async (key: string, value: string, _raw: object, active: Command) => {
		if (key !== 'default-model') fail('E_USAGE', `Unsupported config key ${key}.`, 'input', { hint: 'Use default-model.' });
		const opts = z.strictObject({ config: z.string().optional() }).parse(commandOptions(active));
		await setDefaultModel(value, opts.config);
		process.stdout.write(`${c.green('Saved')} default-model = ${value}\n`);
	});

	const models = addCommand(program, 'models', '', false);
	const listModels = async (active: Command): Promise<void> => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const value = await loadConfig(opts.config);
		opts.json
			? json({ schemaVersion: PROTOCOL, default: value.defaultModel ?? null, models: value.models })
			: process.stdout.write(value.models.length > 0
				? `${value.models.map(model => `${model}${model === value.defaultModel ? ' (default)' : ''}`).join('\n')}\n`
				: 'No model configured.\n');
	};
	models.option('--json').option('--config <path>').action((_raw: object, active: Command) => listModels(active));
	models.command('list').option('--json').option('--config <path>').helpOption(false).action((_raw: object, active: Command) => listModels(active));
	models.command('configure <model>').option('--config <path>').option('--json').helpOption(false).action(async (model: string, _raw: object, active: Command) => {
		const opts = z.strictObject({ json: z.boolean().default(false), config: z.string().optional() }).parse(commandOptions(active));
		const ref = ModelRefSchema.parse(model);
		await setDefaultModel(ref, opts.config);
		const value = { schemaVersion: PROTOCOL, ok: true, defaultModel: ref };
		opts.json ? json(value) : process.stdout.write(`${c.green('Saved')} default model ${ref}\n`);
	});
	models.command('test <model>')
		.option('--config <path>')
		.option('--timeout <ms>')
		.option('--json')
		.helpOption(false)
		.action(async (model: string, _raw: object, active: Command) => {
			const opts = z.strictObject({
				json: z.boolean().default(false),
				config: z.string().optional(),
				timeout: z.coerce.number().int().positive().default(30_000),
			}).parse(commandOptions(active));
			const ref = ModelRefSchema.parse(model);
			const response = await interpret({
				prompt: 'Reply with exactly OK.',
				context: 'Provider connectivity test.',
				model: ref,
				config: await loadConfig(opts.config),
				timeout: opts.timeout,
			});
			const value = { schemaVersion: PROTOCOL, ok: true, provider: response.provider, model: response.model };
			opts.json ? json(value) : process.stdout.write(`${c.green('Connected')} ${response.provider}/${response.model}\n`);
		});

	addCommand(program, 'explain', '<code>').action((code: string) => {
		const key = CodeSchema.parse(code);
		const doc = ERROR_DOCS[key];
		process.stdout.write(`${key}\n${doc.meaning}\n\nRecovery\n  ${doc.recovery}\n`);
	});

	addCommand(program, 'completions', '<shell>').action((shell: string) => {
		const names = COMMANDS.map(command => command.name).join(' ');
		if (shell === 'zsh') process.stdout.write(`#compdef aria-clip\n_arguments '1:command:(${names})'\n`);
		else if (shell === 'bash') process.stdout.write(`complete -W "${names}" aria-clip\n`);
		else if (shell === 'fish') process.stdout.write(`complete -c aria-clip -f -a "${names}"\n`);
		else fail('E_USAGE', `Unsupported shell ${shell}.`, 'input', { hint: 'Choose zsh, bash, or fish.' });
	});
}

function normalized(argv: readonly string[]): string[] {
	const args = [...argv];
	if (args[0] && UrlSchema.safeParse(args[0]).success) args.unshift('capture');
	return args;
}

function wants(args: readonly string[], flag: '--json' | '--jsonl'): boolean {
	return args.includes(flag);
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
	const args = normalized(argv);
	if (args.includes('--help=all')) {
		const name = args.find(value => findCommand(value));
		const command = name ? findCommand(name) : undefined;
		process.stdout.write(`${command ? commandHelp(command, true) : allHelp()}\n`);
		return 0;
	}
	if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
		const name = args.find(value => findCommand(value));
		const command = name ? findCommand(name) : undefined;
		process.stdout.write(`${command ? commandHelp(command) : topHelp()}\n`);
		return 0;
	}
	if (args.includes('--version') || args.includes('-V')) {
		process.stdout.write(`${VERSION}\n`);
		return 0;
	}

	const program = new Command()
		.name('aria-clip')
		.version(VERSION)
		.helpOption(false)
		.showSuggestionAfterError(true)
		.exitOverride()
		.configureOutput({ writeErr: () => undefined, writeOut: () => undefined });
	for (const definition of COMMANDS.filter(command => command.group === 'transform')) addRun(program, definition);
	discovery(program);

	try {
		await program.parseAsync(args, { from: 'user' });
		return 0;
	} catch (error) {
		const fault = error instanceof CommanderError
			? new Fault({ code: 'E_USAGE', message: error.message, hint: 'Run `aria-clip --help`.', retryable: false, stage: 'input' })
			: asFault(error);
		if (wants(args, '--jsonl')) event('failed', failure(fault));
		else if (wants(args, '--json')) json(failure(fault));
		else humanError(fault);
		return fault.exit;
	}
}

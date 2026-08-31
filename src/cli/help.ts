import pc from 'picocolors';
import { ADVANCED_OPTS, COMMANDS, findCommand, type Cmd, type Opt } from './registry.js';

const color = process.stdout.isTTY === true
	&& process.env.NO_COLOR === undefined
	&& process.env.TERM !== 'dumb';
const c = pc.createColors(color);

function rows(items: readonly [string, string][]): string {
	const width = Math.max(...items.map(([left]) => left.length));
	return items.map(([left, right]) => `  ${c.cyan(left.padEnd(width))}  ${c.gray(right)}`).join('\n');
}

function section(title: string, body: string): string {
	return `${c.bold(title)}\n${body}`;
}

function optionRows(opts: readonly Opt[]): string {
	return rows(opts.map(option => [option.flags, option.description]));
}

export function topHelp(): string {
	return [
		c.bold('ARIA CLIP'),
		c.gray('Capture the web as durable Markdown.'),
		'',
		section('Usage', '  aria-clip|clip <url> [options]'),
		'',
		section('Capture and transform', rows([
			['aria-clip <url>', 'Capture clean Markdown'],
			['aria-clip auto <url>', 'Choose an unambiguous template'],
			['aria-clip paper <url>', 'Create rigorous paper notes'],
			['clip video <url>', 'Create structured video notes'],
			['aria-clip help transforms', 'Show every transformation'],
		])),
		'',
		section('Deliver', rows([
			['--save [path]', 'Write a Markdown file'],
			['--add', 'Add the capture to Aria'],
			['--dry-run', 'Resolve without model calls or writes'],
		])),
		'',
		section('Discover', rows([
			['help agent', 'Complete agent operating guide'],
			['templates list', 'List available templates'],
			['setup', 'Add browser-native workflows'],
		])),
		c.gray('More: aria-clip --help=all'),
	].join('\n');
}

export function commandHelp(command: Cmd, all = false): string {
	const args = command.args.map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`).join(' ');
	return [
		c.bold(command.name.toUpperCase()),
		c.gray(command.summary),
		'',
		section('Usage', `  aria-clip ${command.name} ${args} [options]`.trimEnd()),
		command.args.length > 0 ? `\n${section('Arguments', rows(command.args.map(arg => [arg.name, arg.description])))}` : '',
		command.opts.length > 0 ? `\n${section('Options', optionRows(command.opts.filter(option => all || !option.advanced)))}` : '',
		`\n${section('Examples', command.examples.map(example => `  ${example}`).join('\n'))}`,
		!all && command.opts.some(option => option.advanced) ? `\n${c.gray(`Run aria-clip ${command.name} --help=all for advanced options.`)}` : '',
	].filter(Boolean).join('\n');
}

const TOPICS = {
	agent: `AGENT OPERATING GUIDE

Safe default
  aria-clip <url> --json
  Deterministic extraction. No model call. No write. No Aria mutation.

Interpretive transforms
  summary, news, research, paper, recipe, tutorial, video, product,
  travel, event, person, and code contact a model unless --dry-run is set.

Discovery
  aria-clip describe --json
  aria-clip templates list --json
  aria-clip capabilities --json
  aria-clip schema result --json

Delivery
  --save writes a file. --add invokes the downstream aria command.
  Use --dry-run to resolve either plan without side effects.

Protocols
  --json emits one result to stdout. --jsonl emits versioned events.
  Diagnostics use stderr only in human mode. Nonzero exit means failure.
  Exit families: 2 input, 3 fetch, 4 extract, 5 render, 6 model,
  7 delivery, 8 capability, 9 cancelled, 10 internal.

Recovery
  Read error.code and error.hint. Run aria-clip explain <code> for detail.`,
	transforms: `TRANSFORMS

Deterministic
  capture     Clean Markdown with the Default template
  auto        Match an unambiguous template; may interpret

Interpretive
${COMMANDS.filter(command => command.interpret).map(command => `  ${command.name.padEnd(11)} ${command.summary}`).join('\n')}

Inspect an expansion without executing it:
  aria-clip paper --explain`,
delivery: `DELIVERY

  --to stdout   Print the artifact; this is the default
  --save         Save under ~/.aria/vault/<template folder>
  --save <path>  Save to an explicit path
  --add          Deliver through the downstream aria CLI
  --dry-run      Resolve the complete plan without mutation

Existing files are never replaced unless --overwrite is explicit.`,
	configuration: `CONFIGURATION

Precedence
  flags → environment → --config → ~/.aria/clip/config.json → defaults

  aria-clip config path
  aria-clip config show
  aria-clip models list
  aria-clip doctor

The CLI never reads configuration from the current project directory.`,
	templates: `TEMPLATES

  aria-clip templates list
  aria-clip templates show <id>
  aria-clip templates match <url>
  aria-clip templates validate <file>
  aria-clip templates import <file>
  aria-clip templates export <id>

Built-ins and user templates share one schema. User templates live under
~/.aria/clip/templates unless ARIA_HOME changes the Aria home directory.`,
	models: `MODELS

  aria-clip models list
  aria-clip models configure <provider/model>
  aria-clip models test <provider/model>

Resolution order is --model, template model, configured default, then one
unambiguous configured model. Credentials come from provider environment
variables and are never accepted as command arguments.`,
	automation: `AUTOMATION

  aria-clip <url> --json
  aria-clip paper <url> --json
  aria-clip describe --json
  aria-clip capabilities --json

Use --jsonl for stage events. Never parse human output.`,
	input: `INPUT

  <url>            Fetch an HTTP or HTTPS page
  --html <path>    Read HTML from a file
  --html -         Read HTML from stdin
  --input <path>   Read a saved extraction envelope

Private and loopback network targets are denied unless explicitly allowed.`,
	security: `SECURITY

The default command performs no model call and no mutation. Private network
fetches are denied. Credentials are read from environment or protected config,
never ordinary command arguments. Use --dry-run before delegated delivery.`,
	setup: `BROWSER SETUP

  clip setup
  clip setup --dry-run --json
  clip setup --browser chrome firefox

Setup detects supported browsers and opens only verified official distribution
routes. Browser confirmation is always required. An opened route is never
reported as an installed extension. Headless clipping works without setup.`,
} as const;

export type HelpTopic = keyof typeof TOPICS;

export function topicHelp(topic: string): string | undefined {
	if (topic in TOPICS) return TOPICS[topic as HelpTopic];
	const command = findCommand(topic);
	return command ? commandHelp(command) : undefined;
}

export function allHelp(): string {
	return [
		topHelp(),
		'',
		section('All commands', rows(COMMANDS.map(command => [command.name, command.summary]))),
		'',
		section('Advanced capture options', optionRows(ADVANCED_OPTS)),
	].join('\n');
}

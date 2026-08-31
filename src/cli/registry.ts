import { z } from 'zod';
import {
	CODE_REFERENCE_TEMPLATE_ID,
	EVENT_DETAILS_TEMPLATE_ID,
	NEWS_BRIEF_TEMPLATE_ID,
	PAGE_SUMMARY_TEMPLATE_ID,
	PAPER_NOTES_TEMPLATE_ID,
	PERSON_PROFILE_TEMPLATE_ID,
	PRODUCT_BRIEF_TEMPLATE_ID,
	RECIPE_CARD_TEMPLATE_ID,
	RESEARCH_BRIEF_TEMPLATE_ID,
	TRAVEL_GUIDE_TEMPLATE_ID,
	TUTORIAL_GUIDE_TEMPLATE_ID,
	VIDEO_NOTES_TEMPLATE_ID,
} from '../features/templates/builtin-templates.js';
import {
	EffectSchema,
	ExpansionSchema,
	GroupSchema,
	TransformSchema,
	type CommandName,
	type Expansion,
	type Transform,
} from './schema.js';
import { PROTOCOL } from './version.js';

export interface Arg {
	name: string;
	required: boolean;
	description: string;
}

export interface Opt {
	flags: string;
	description: string;
	choices?: readonly string[];
	conflicts?: readonly string[];
	implies?: readonly string[];
	effects?: readonly z.infer<typeof EffectSchema>[];
	advanced?: boolean;
	default?: string | number | boolean;
}

export interface Cmd {
	name: CommandName;
	group: z.infer<typeof GroupSchema>;
	summary: string;
	args: readonly Arg[];
	opts: readonly Opt[];
	examples: readonly string[];
	template?: string;
	interpret?: boolean;
}

export const COMMON_OPTS = [
	{ flags: '--save [path]', description: 'Save under the template folder or at the given path.', effects: ['file'] },
	{ flags: '--add', description: 'Deliver through the Aria CLI.', effects: ['aria'] },
	{ flags: '--to <target>', description: 'Choose stdout, file, or aria.', choices: ['stdout', 'file', 'aria'], default: 'stdout' },
	{ flags: '--model <provider/model>', description: 'Override the configured Interpreter model.', effects: ['model'] },
	{ flags: '--json', description: 'Write one structured result to stdout.', conflicts: ['jsonl'], default: false },
	{ flags: '--jsonl', description: 'Stream versioned JSON events to stdout.', conflicts: ['json'], default: false },
	{ flags: '--dry-run', description: 'Resolve the operation without model calls or delivery.', default: false },
	{ flags: '--explain', description: 'Show the canonical expansion without executing.', default: false },
] as const satisfies readonly Opt[];

export const ADVANCED_OPTS = [
	{ flags: '--template <id>', description: 'Use a built-in or user template ID.' },
	{ flags: '--template-file <path>', description: 'Use a template JSON file or directory.' },
	{ flags: '--html <path>', description: 'Read HTML from a file; use - for stdin.' },
	{ flags: '--input <path>', description: 'Read a saved extraction envelope; use - for stdin.' },
	{ flags: '--output <path>', description: 'Compatibility alias for --save <path>.', effects: ['file'], advanced: true },
	{ flags: '--interpret', description: 'Run the template prompt through an Interpreter model.', effects: ['model'] },
	{ flags: '--include <section...>', description: 'Include source, variables, or trace in structured output.', advanced: true },
	{ flags: '--trace <path>', description: 'Write a redacted execution trace.', effects: ['file'], advanced: true },
	{ flags: '--overwrite', description: 'Permit replacing an existing output file.', effects: ['file'], advanced: true, default: false },
	{ flags: '--vault <name>', description: 'Override the Aria vault.', advanced: true },
	{ flags: '--property-types <path>', description: 'Read a property-type mapping from JSON.', advanced: true },
	{ flags: '--config <path>', description: 'Read an explicit CLI configuration file.', advanced: true },
	{ flags: '--timeout <ms>', description: 'Set the network timeout in milliseconds.', advanced: true, default: 30_000 },
	{ flags: '--max-bytes <count>', description: 'Set the maximum network response size.', advanced: true, default: 10 * 1024 * 1024 },
	{ flags: '--allow-private-network', description: 'Permit private or loopback network targets.', effects: ['network'], advanced: true, default: false },
	{ flags: '--open', description: 'Compatibility alias for --add.', effects: ['aria'], advanced: true },
] as const satisfies readonly Opt[];

const TEMPLATE_BY_TRANSFORM = {
	summary: PAGE_SUMMARY_TEMPLATE_ID,
	news: NEWS_BRIEF_TEMPLATE_ID,
	research: RESEARCH_BRIEF_TEMPLATE_ID,
	paper: PAPER_NOTES_TEMPLATE_ID,
	recipe: RECIPE_CARD_TEMPLATE_ID,
	tutorial: TUTORIAL_GUIDE_TEMPLATE_ID,
	video: VIDEO_NOTES_TEMPLATE_ID,
	product: PRODUCT_BRIEF_TEMPLATE_ID,
	travel: TRAVEL_GUIDE_TEMPLATE_ID,
	event: EVENT_DETAILS_TEMPLATE_ID,
	person: PERSON_PROFILE_TEMPLATE_ID,
	code: CODE_REFERENCE_TEMPLATE_ID,
} as const satisfies Record<Transform, string>;

const TRANSFORM_SUMMARY = {
	summary: 'Create a concise page summary.',
	news: 'Create a precise news brief.',
	research: 'Create a rigorous research brief.',
	paper: 'Create rigorous scholarly paper notes.',
	recipe: 'Create a practical recipe card.',
	tutorial: 'Create an executable tutorial guide.',
	video: 'Create structured video notes.',
	product: 'Create a neutral product brief.',
	travel: 'Create a compact travel guide.',
	event: 'Create complete event details.',
	person: 'Create a sourced person profile.',
	code: 'Create a durable code reference.',
} as const satisfies Record<Transform, string>;

const URL_ARG = [{ name: 'url', required: true, description: 'HTTP or HTTPS source URL.' }] as const;

const transforms: Cmd[] = TransformSchema.options.map((name) => ({
	name,
	group: 'transform',
	summary: TRANSFORM_SUMMARY[name],
	args: URL_ARG,
	opts: [...COMMON_OPTS, ...ADVANCED_OPTS],
	examples: [`aria-clip ${name} https://example.com`, `aria-clip ${name} https://example.com --json`],
	template: TEMPLATE_BY_TRANSFORM[name],
	interpret: true,
}));

const commands: Cmd[] = [
	{
		name: 'capture',
		group: 'transform',
		summary: 'Capture clean Markdown without a model.',
		args: URL_ARG,
		opts: [...COMMON_OPTS, ...ADVANCED_OPTS],
		examples: ['aria-clip https://example.com', 'aria-clip capture https://example.com --save'],
	},
	{
		name: 'auto',
		group: 'transform',
		summary: 'Choose an unambiguous template from page signals.',
		args: URL_ARG,
		opts: [...COMMON_OPTS, ...ADVANCED_OPTS],
		examples: ['aria-clip auto https://arxiv.org/html/1706.03762'],
	},
	...transforms,
	{
		name: 'help', group: 'discover', summary: 'Show focused operating guidance.',
		args: [{ name: 'topic', required: false, description: 'Command or help topic.' }], opts: [],
		examples: ['aria-clip help agent', 'aria-clip help delivery'],
	},
	{
		name: 'describe', group: 'discover', summary: 'Describe commands as structured metadata.',
		args: [{ name: 'name', required: false, description: 'Command to describe.' }],
		opts: [{ flags: '--json', description: 'Write structured command metadata.' }],
		examples: ['aria-clip describe --json', 'aria-clip describe paper --json'],
	},
	{
		name: 'capabilities', group: 'discover', summary: 'Inspect runtime features and integrations.', args: [],
		opts: [
			{ flags: '--json', description: 'Write structured capability metadata.' },
			{ flags: '--config <path>', description: 'Read an explicit CLI configuration file.' },
		],
		examples: ['aria-clip capabilities', 'aria-clip capabilities --json'],
	},
	{
		name: 'doctor', group: 'discover', summary: 'Diagnose configuration and delivery.', args: [],
		opts: [
			{ flags: '--json', description: 'Write structured diagnostic checks.' },
			{ flags: '--config <path>', description: 'Read an explicit CLI configuration file.' },
		],
		examples: ['aria-clip doctor', 'aria-clip doctor --json'],
	},
	{
		name: 'explain', group: 'discover', summary: 'Explain a stable error code.',
		args: [{ name: 'code', required: true, description: 'Stable E_* error code.' }], opts: [],
		examples: ['aria-clip explain E_MODEL_NOT_CONFIGURED'],
	},
	{
		name: 'examples', group: 'discover', summary: 'List executable examples.', args: [],
		opts: [{ flags: '--json', description: 'Write examples as structured data.' }],
		examples: ['aria-clip examples', 'aria-clip examples --json'],
	},
	{
		name: 'schema', group: 'discover', summary: 'Print a bundled JSON Schema.',
		args: [{ name: 'name', required: true, description: 'Bundled schema name.' }],
		opts: [{ flags: '--json', description: 'Retained for protocol symmetry; output is always JSON.' }],
		examples: ['aria-clip schema result --json', 'aria-clip schema capture --json'],
	},
	{
		name: 'templates', group: 'discover', summary: 'List, inspect, match, and validate templates.',
		args: [{ name: 'action', required: false, description: 'list, show, match, validate, import, or export.' }],
		opts: [
			{ flags: '--json', description: 'Write structured template data.' },
			{ flags: '--config <path>', description: 'Read an explicit CLI configuration file.' },
		],
		examples: ['aria-clip templates list', 'aria-clip templates show builtin-paper-notes --json'],
	},
	{
		name: 'models', group: 'configure', summary: 'List, configure, and test Interpreter models.',
		args: [{ name: 'action', required: false, description: 'list, configure, or test.' }],
		opts: [
			{ flags: '--json', description: 'Write structured model data.' },
			{ flags: '--config <path>', description: 'Read an explicit CLI configuration file.' },
		],
		examples: ['aria-clip models list', 'aria-clip models configure openai/gpt-5.6-sol'],
	},
	{
		name: 'config', group: 'configure', summary: 'Inspect and update CLI configuration.',
		args: [{ name: 'action', required: true, description: 'path, show, or set.' }],
		opts: [{ flags: '--config <path>', description: 'Read or write an explicit configuration file.' }],
		examples: ['aria-clip config path', 'aria-clip config set default-model openai/gpt-5.6-sol'],
	},
	{
		name: 'setup', group: 'configure', summary: 'Open verified browser installation surfaces.', args: [],
		opts: [
			{ flags: '--browser <browser...>', description: 'Target Chrome, Firefox, or Safari.', choices: ['chrome', 'firefox', 'safari'] },
			{ flags: '--dry-run', description: 'Detect browsers without opening external applications.', default: false },
			{ flags: '--json', description: 'Write structured browser setup states.' },
		],
		examples: ['clip setup', 'clip setup --dry-run --json', 'clip setup --browser firefox'],
	},
	{
		name: 'completions', group: 'discover', summary: 'Generate shell completions.',
		args: [{ name: 'shell', required: true, description: 'zsh, bash, or fish.' }], opts: [],
		examples: ['aria-clip completions zsh'],
	},
];

export const COMMANDS = commands;

export function findCommand(name: string): Cmd | undefined {
	return COMMANDS.find(command => command.name === name);
}

export function findTransform(name: string): Cmd | undefined {
	const parsed = TransformSchema.safeParse(name);
	return parsed.success ? findCommand(parsed.data) : undefined;
}

export function expand(command: Cmd): Expansion {
	return ExpansionSchema.parse({
		schemaVersion: PROTOCOL,
		command: command.name,
		canonical: `capture <url>${command.template ? ` --template ${command.template}` : ''}${command.interpret ? ' --interpret' : ''}`,
		template: command.template ?? 'builtin-default',
		interpret: command.interpret ?? false,
		modelResolution: ['flag', 'template', 'default', 'configured', 'fail'],
		effects: command.interpret ? ['network', 'model'] : ['network'],
		defaultDelivery: 'stdout',
	});
}

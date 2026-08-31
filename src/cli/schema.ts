import { z } from 'zod';
import { ArtifactTypeSchema } from '../schemas/artifact.js';
import { BrowserIdSchema, SetupResultSchema } from '../schemas/browser.js';
import { CaptureAckSchema, CaptureSchema } from '../schemas/capture.js';
import { ApiSchema } from '../schemas/model.js';
import { BehaviorSchema } from '../schemas/template.js';
import { PROTOCOL } from './version.js';

export const TransformSchema = z.enum([
	'summary',
	'news',
	'research',
	'paper',
	'recipe',
	'tutorial',
	'video',
	'product',
	'travel',
	'event',
	'person',
	'code',
]);

export const CommandSchema = z.enum([
	'capture',
	'auto',
	...TransformSchema.options,
	'help',
	'describe',
	'capabilities',
	'doctor',
	'explain',
	'examples',
	'schema',
	'templates',
	'models',
	'config',
	'setup',
	'completions',
]);

export const StageSchema = z.enum([
	'input',
	'fetch',
	'extract',
	'match',
	'render',
	'interpret',
	'deliver',
	'capability',
	'setup',
	'internal',
]);

export const CodeSchema = z.enum([
	'E_USAGE',
	'E_URL_INVALID',
	'E_TEMPLATE_INVALID',
	'E_TEMPLATE_NOT_FOUND',
	'E_TEMPLATE_NO_MATCH',
	'E_INPUT_FAILED',
	'E_FETCH_FAILED',
	'E_FETCH_TIMEOUT',
	'E_PRIVATE_NETWORK',
	'E_RESPONSE_TOO_LARGE',
	'E_CONTENT_UNAVAILABLE',
	'E_BROWSER_REQUIRED',
	'E_EXTRACT_FAILED',
	'E_RENDER_FAILED',
	'E_MODEL_NOT_CONFIGURED',
	'E_PROVIDER_FAILED',
	'E_DELIVERY_CONFLICT',
	'E_DELIVERY_FAILED',
	'E_ARIA_UNAVAILABLE',
	'E_SETUP_FAILED',
	'E_CANCELLED',
	'E_INTERNAL',
]);

export const ExitSchema = z.union([
	z.literal(0),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
	z.literal(6),
	z.literal(7),
	z.literal(8),
	z.literal(9),
	z.literal(10),
]);

export const ErrorSchema = z.strictObject({
	code: CodeSchema,
	message: z.string().min(1),
	hint: z.string().min(1).optional(),
	retryable: z.boolean(),
	stage: StageSchema,
});

export const FailureSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	ok: z.literal(false),
	error: ErrorSchema,
	sideEffects: z.array(z.string()),
});

export const DeliveryKindSchema = z.enum(['stdout', 'file', 'aria']);
export const SourceKindSchema = z.enum(['network', 'file', 'stdin', 'envelope']);
export const TemplateSourceSchema = z.enum(['builtin', 'user', 'file', 'directory', 'auto', 'default']);

const InputSchema = z.strictObject({
	requestedUrl: z.url(),
	finalUrl: z.url(),
	source: SourceKindSchema,
	redirects: z.array(z.url()),
	contentType: z.string(),
	bytes: z.number().int().nonnegative(),
	fetchedAt: z.iso.datetime().nullable(),
	hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

const TemplateRefSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	artifact: ArtifactTypeSchema.nullable(),
	source: TemplateSourceSchema,
	version: z.literal('1'),
	hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

const InterpreterSchema = z.strictObject({
	performed: z.boolean(),
	provider: z.string().min(1).nullable(),
	model: z.string().min(1).nullable(),
});

const ArtifactSchema = z.strictObject({
	title: z.string(),
	fileName: z.string().min(1),
	mediaType: z.literal('text/markdown'),
	hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
	markdown: z.string(),
});

const DeliverySchema = z.strictObject({
	requested: DeliveryKindSchema,
	performed: z.boolean(),
	path: z.string().optional(),
	hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
	behavior: BehaviorSchema.optional(),
	identity: z.string().optional(),
	destination: z.string().optional(),
	result: z.string().optional(),
});

const IncludedSchema = z.strictObject({
	source: z.string().optional(),
	variables: z.record(z.string(), z.string()).optional(),
	trace: z.strictObject({
		templateSource: z.string(),
		prompts: z.number().int().nonnegative(),
		interpret: z.boolean(),
		delivery: DeliveryKindSchema,
	}).optional(),
});

export const ResultSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	ok: z.literal(true),
	command: CommandSchema,
	input: InputSchema,
	template: TemplateRefSchema,
	interpreter: InterpreterSchema,
	artifact: ArtifactSchema,
	delivery: DeliverySchema,
	included: IncludedSchema.optional(),
	warnings: z.array(z.string()),
	timingMs: z.record(z.string(), z.number().nonnegative()),
});

export const EventNameSchema = z.enum([
	'started',
	'fetched',
	'extracted',
	'matched',
	'rendered',
	'interpreting',
	'interpreted',
	'delivering',
	'completed',
	'failed',
]);

export const EventSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	event: EventNameSchema,
	time: z.iso.datetime(),
	data: z.json().optional(),
});

export const TraceSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	createdAt: z.iso.datetime(),
	command: CommandSchema,
	source: z.strictObject({
		requestedUrl: z.url(),
		finalUrl: z.url(),
		kind: SourceKindSchema,
		bytes: z.number().int().nonnegative(),
		hash: z.string(),
	}),
	template: z.strictObject({
		id: z.string(),
		source: TemplateSourceSchema,
		hash: z.string(),
	}),
	interpreter: InterpreterSchema,
	delivery: z.strictObject({
		requested: DeliveryKindSchema,
		performed: z.boolean(),
		behavior: BehaviorSchema.optional(),
	}),
	warnings: z.array(z.string()),
	timingMs: z.record(z.string(), z.number().nonnegative()),
});

export const CapabilitySchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	version: z.string(),
	protocolVersion: z.literal(PROTOCOL),
	runtime: z.strictObject({
		name: z.enum(['node', 'bun']),
		version: z.string(),
		platform: z.enum(['aix', 'android', 'darwin', 'freebsd', 'haiku', 'linux', 'openbsd', 'sunos', 'win32', 'cygwin', 'netbsd']),
	}),
	input: z.array(SourceKindSchema),
	delivery: z.array(DeliveryKindSchema),
	aria: z.strictObject({
		installed: z.boolean(),
		available: z.boolean(),
		version: z.string().nullable(),
	}),
	paths: z.strictObject({
		home: z.string(),
		config: z.string(),
		templates: z.string(),
	}),
	setup: z.strictObject({
		command: z.literal('setup'),
		browsers: z.array(BrowserIdSchema),
	}),
	providers: z.array(z.strictObject({
		id: z.string(),
		api: ApiSchema,
		credential: z.boolean(),
	})),
	defaultModel: z.string().nullable(),
	models: z.array(z.string()),
	unavailable: z.array(z.strictObject({
		feature: z.enum(['aria', 'interpreter']),
		reason: z.string(),
	})),
	templates: z.array(z.strictObject({
		id: z.string(),
		name: z.string(),
		artifact: ArtifactTypeSchema.nullable(),
		interprets: z.boolean(),
	})),
});

export const EffectSchema = z.enum(['network', 'model', 'file', 'aria', 'browser']);
export const GroupSchema = z.enum(['transform', 'discover', 'configure', 'deliver']);

export const ExpansionSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	command: CommandSchema,
	canonical: z.string(),
	template: z.string(),
	interpret: z.boolean(),
	modelResolution: z.array(z.enum(['flag', 'template', 'default', 'configured', 'fail'])),
	effects: z.array(EffectSchema),
	defaultDelivery: DeliveryKindSchema,
});

const ArgSchema = z.strictObject({
	name: z.string(),
	required: z.boolean(),
	description: z.string(),
});

const OptSchema = z.strictObject({
	flags: z.string(),
	description: z.string(),
	choices: z.array(z.string()).optional(),
	conflicts: z.array(z.string()).optional(),
	implies: z.array(z.string()).optional(),
	effects: z.array(EffectSchema).optional(),
	advanced: z.boolean().optional(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const CommandDocSchema = z.strictObject({
	name: CommandSchema,
	group: GroupSchema,
	summary: z.string(),
	args: z.array(ArgSchema),
	opts: z.array(OptSchema),
	examples: z.array(z.string()),
	template: z.string().optional(),
	interpret: z.boolean().optional(),
});

export const DescribeSchema = z.strictObject({
	schemaVersion: z.literal(PROTOCOL),
	program: z.literal('aria-clip'),
	commands: z.array(CommandDocSchema),
});

export const SchemaNameSchema = z.enum([
	'result',
	'error',
	'event',
	'capabilities',
	'describe',
	'template',
	'capture',
	'capture-ack',
	'setup',
]);

export { CaptureAckSchema, CaptureSchema, SetupResultSchema };

export type Transform = z.infer<typeof TransformSchema>;
export type CommandName = z.infer<typeof CommandSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type ErrorCode = z.infer<typeof CodeSchema>;
export type ExitCode = z.infer<typeof ExitSchema>;
export type ClipError = z.infer<typeof ErrorSchema>;
export type Failure = z.infer<typeof FailureSchema>;
export type DeliveryKind = z.infer<typeof DeliveryKindSchema>;
export type SourceKind = z.infer<typeof SourceKindSchema>;
export type TemplateSource = z.infer<typeof TemplateSourceSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type EventName = z.infer<typeof EventNameSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Expansion = z.infer<typeof ExpansionSchema>;
export type CommandDoc = z.infer<typeof CommandDocSchema>;
export type Describe = z.infer<typeof DescribeSchema>;
export type SchemaName = z.infer<typeof SchemaNameSchema>;

import { z } from 'zod';
import { ModelRefSchema } from '../schemas/model.js';
import { DeliveryKindSchema } from './schema.js';

export const UrlSchema = z.url().refine((value) => {
	return value.startsWith('http://') || value.startsWith('https://');
}, 'URL must use HTTP or HTTPS');

const PositiveInt = z.coerce.number().int().positive();
const SaveSchema = z.union([z.boolean(), z.string().min(1)]).optional();
const IncludeSchema = z.array(z.enum(['source', 'variables', 'trace'])).default([]);

export const RunOptsSchema = z.strictObject({
	save: SaveSchema,
	add: z.boolean().default(false),
	to: DeliveryKindSchema.optional(),
	model: ModelRefSchema.optional(),
	json: z.boolean().default(false),
	jsonl: z.boolean().default(false),
	dryRun: z.boolean().default(false),
	template: z.string().min(1).optional(),
	templateFile: z.string().min(1).optional(),
	html: z.string().min(1).optional(),
	input: z.string().min(1).optional(),
	output: z.string().min(1).optional(),
	interpret: z.boolean().default(false),
	include: IncludeSchema,
	trace: z.string().min(1).optional(),
	overwrite: z.boolean().default(false),
	vault: z.string().min(1).optional(),
	propertyTypes: z.string().min(1).optional(),
	config: z.string().min(1).optional(),
	timeout: PositiveInt.default(30_000),
	maxBytes: PositiveInt.default(10 * 1024 * 1024),
	allowPrivateNetwork: z.boolean().default(false),
	open: z.boolean().default(false),
	explain: z.boolean().default(false),
}).superRefine((opts, context) => {
	if (opts.json && opts.jsonl) {
		context.addIssue({ code: 'custom', path: ['jsonl'], message: '--json and --jsonl cannot be combined' });
	}
	if (opts.html && opts.input) {
		context.addIssue({ code: 'custom', path: ['input'], message: '--html and --input cannot be combined' });
	}
	const targets = [opts.to, opts.save !== undefined || opts.output ? 'file' : undefined, opts.add || opts.open ? 'aria' : undefined]
		.filter((value): value is string => value !== undefined);
	if (new Set(targets).size > 1) {
		context.addIssue({ code: 'custom', path: ['to'], message: 'Choose one delivery target' });
	}
});

export type RunOpts = z.infer<typeof RunOptsSchema>;

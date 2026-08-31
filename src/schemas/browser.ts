import { z } from 'zod';
import data from '../../browsers.json' with { type: 'json' };

export const BrowserIdSchema = z.enum(['chrome', 'firefox', 'safari']);
export const HostSchema = z.enum(['darwin', 'linux', 'win32']);
export const SetupStateSchema = z.enum([
	'not-detected',
	'unpublished',
	'ready',
	'confirmation-required',
]);

const DetectSchema = z.strictObject({
	apps: z.array(z.string().min(1)),
	bins: z.array(z.string().min(1)),
});

const StoreSchema = z.strictObject({
	kind: z.literal('store'),
	url: z.url(),
	label: z.string().min(1),
});

const SignedSchema = z.strictObject({
	kind: z.literal('signed'),
	url: z.url(),
	label: z.string().min(1),
});

const AppSchema = z.strictObject({
	kind: z.literal('app'),
	url: z.url(),
	label: z.string().min(1),
});

const UnpublishedSchema = z.strictObject({
	kind: z.literal('unpublished'),
	reason: z.string().min(1),
});

export const RouteSchema = z.discriminatedUnion('kind', [
	StoreSchema,
	SignedSchema,
	AppSchema,
	UnpublishedSchema,
]);

export const BrowserSchema = z.strictObject({
	id: BrowserIdSchema,
	name: z.string().min(1),
	platforms: z.array(HostSchema).min(1),
	detect: z.partialRecord(HostSchema, DetectSchema),
	route: RouteSchema,
});

export const BrowserCatalogSchema = z.strictObject({
	schemaVersion: z.literal('1'),
	browsers: z.array(BrowserSchema).length(BrowserIdSchema.options.length),
}).superRefine((value, ctx) => {
	for (const id of BrowserIdSchema.options) {
		if (value.browsers.filter(browser => browser.id === id).length !== 1) {
			ctx.addIssue({
				code: 'custom',
				message: `Browser catalog must contain exactly one ${id} entry.`,
			});
		}
	}
});

export const SetupItemSchema = z.strictObject({
	id: BrowserIdSchema,
	name: z.string().min(1),
	detected: z.boolean(),
	state: SetupStateSchema,
	route: RouteSchema,
	launched: z.boolean(),
	confirmationRequired: z.boolean(),
	next: z.string().min(1),
});

export const SetupResultSchema = z.strictObject({
	schemaVersion: z.literal('1'),
	version: z.string().min(1),
	platform: HostSchema,
	dryRun: z.boolean(),
	browsers: z.array(SetupItemSchema),
});

export const BROWSERS = BrowserCatalogSchema.parse(data);

export type BrowserId = z.infer<typeof BrowserIdSchema>;
export type Host = z.infer<typeof HostSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Browser = z.infer<typeof BrowserSchema>;
export type BrowserCatalog = z.infer<typeof BrowserCatalogSchema>;
export type SetupItem = z.infer<typeof SetupItemSchema>;
export type SetupResult = z.infer<typeof SetupResultSchema>;

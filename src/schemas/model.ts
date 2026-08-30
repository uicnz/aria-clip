import { z } from 'zod';

export const ApiSchema = z.enum([
	'anthropic',
	'azure',
	'deepseek',
	'gemini',
	'huggingface',
	'ollama',
	'openai',
	'perplexity',
]);

export const ProviderIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const ModelIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);
export const ModelRefSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._:/-]*$/);

export const PopularModelSchema = z.strictObject({
	id: ModelIdSchema,
	name: z.string().trim().min(1),
	recommended: z.boolean().optional(),
});

export const PresetSchema = z.strictObject({
	id: ProviderIdSchema,
	name: z.string().trim().min(1),
	api: ApiSchema,
	baseUrl: z.url(),
	keyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
	apiKeyUrl: z.url().optional(),
	apiKeyRequired: z.boolean().optional(),
	modelsList: z.url().optional(),
	popularModels: z.array(PopularModelSchema).optional(),
});

export const CatalogSchema = z.strictObject({
	version: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	providers: z.record(ProviderIdSchema, PresetSchema),
}).superRefine((catalog, ctx) => {
	for (const [id, provider] of Object.entries(catalog.providers)) {
		if (provider.id !== id) {
			ctx.addIssue({
				code: 'custom',
				message: `Provider key ${id} must match its id ${provider.id}.`,
				path: ['providers', id, 'id'],
			});
		}
	}
});

export const ProviderSchema = z.strictObject({
	id: ProviderIdSchema,
	name: z.string().trim().min(1),
	api: ApiSchema.optional(),
	baseUrl: z.url(),
	apiKey: z.string(),
	apiKeyRequired: z.boolean().optional(),
	presetId: ProviderIdSchema.optional(),
});

export const ModelSchema = z.strictObject({
	id: z.string().min(1),
	providerId: ProviderIdSchema,
	providerModelId: ModelIdSchema,
	name: z.string().trim().min(1),
	enabled: z.boolean(),
});

export type Api = z.infer<typeof ApiSchema>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type ModelId = z.infer<typeof ModelIdSchema>;
export type ModelRef = z.infer<typeof ModelRefSchema>;
export type PopularModel = z.infer<typeof PopularModelSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Model = z.infer<typeof ModelSchema>;

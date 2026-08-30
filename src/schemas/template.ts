import { z } from 'zod';
import { ArtifactTypeSchema } from './artifact.js';
import { ModelRefSchema } from './model.js';

export const TemplateIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);

export const BehaviorSchema = z.enum([
	'create',
	'append-specific',
	'append-daily',
	'prepend-specific',
	'prepend-daily',
	'overwrite',
]);

export const ValueKindSchema = z.enum([
	'text',
	'multitext',
	'number',
	'checkbox',
	'date',
	'datetime',
]);

export const PropertySchema = z.strictObject({
	id: z.string().min(1).optional(),
	name: z.string().min(1),
	value: z.string(),
	type: ValueKindSchema.optional(),
});

export const TypeSchema = z.strictObject({
	name: z.string().trim().min(1),
	type: ValueKindSchema,
	defaultValue: z.string().optional(),
});

export const TypesFileSchema = z.strictObject({
	types: z.record(z.string().trim().min(1), ValueKindSchema),
});

export const TemplateSchema = z.strictObject({
	id: TemplateIdSchema,
	name: z.string().min(1),
	behavior: BehaviorSchema,
	noteNameFormat: z.string(),
	path: z.string(),
	noteContentFormat: z.string(),
	properties: z.array(PropertySchema),
	triggers: z.array(z.string().trim().min(1)).optional(),
	vault: z.string().optional(),
	context: z.string().optional(),
	artifactType: ArtifactTypeSchema.optional(),
	model: ModelRefSchema.optional(),
});

export const TemplateImportSchema = z.strictObject({
	schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
	id: TemplateIdSchema.optional(),
	name: z.string().min(1),
	behavior: BehaviorSchema,
	noteNameFormat: z.string().optional(),
	path: z.string().optional(),
	noteContentFormat: z.string(),
	properties: z.array(PropertySchema),
	triggers: z.array(z.string().trim().min(1)).optional(),
	vault: z.string().optional(),
	context: z.string().optional(),
	artifactType: ArtifactTypeSchema.optional(),
	model: ModelRefSchema.optional(),
}).superRefine((template, context) => {
	const isDaily = template.behavior === 'append-daily' || template.behavior === 'prepend-daily';
	if (!isDaily && template.noteNameFormat === undefined) {
		context.addIssue({
			code: 'custom',
			path: ['noteNameFormat'],
			message: 'Note name format is required for named-note behaviors',
		});
	}
	if (!isDaily && template.path === undefined) {
		context.addIssue({
			code: 'custom',
			path: ['path'],
			message: 'Folder path is required for named-note behaviors',
		});
	}
});

export type Behavior = z.infer<typeof BehaviorSchema>;
export type ValueKind = z.infer<typeof ValueKindSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type PropertyType = z.infer<typeof TypeSchema>;
export type TypesFile = z.infer<typeof TypesFileSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type TemplateImport = z.infer<typeof TemplateImportSchema>;

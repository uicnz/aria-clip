import { z } from 'zod';
import { ArtifactTypeSchema } from './artifact.js';
import { BehaviorSchema, ValueKindSchema } from './template.js';

const HashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const LocationSchema = z.strictObject({
	behavior: BehaviorSchema,
	noteName: z.string().min(1),
	folder: z.string(),
	vault: z.string(),
});

export const CaptureSchema = z.strictObject({
	version: z.literal(1),
	captureId: z.string().regex(/^[a-f0-9]{32}$/),
	capturedAt: z.iso.datetime(),
	producer: z.strictObject({
		name: z.literal('Aria Clip'),
		version: z.string().regex(/^\d+\.\d+\.\d+$/),
		runtime: z.string().min(1),
	}),
	source: z.strictObject({
		url: z.url(),
		title: z.string(),
		description: z.string(),
		domain: z.string(),
		site: z.string(),
		author: z.string(),
		published: z.string(),
		language: z.string(),
		favicon: z.string(),
		image: z.string(),
		hash: HashSchema,
	}),
	capture: z.strictObject({
		renderedMarkdown: z.string(),
		articleHtml: z.string(),
		selectedHtml: z.string(),
		cleanedDocumentHtml: z.string(),
		highlights: z.array(z.json()),
		extractedContent: z.record(z.string(), z.string()),
		extractedVariables: z.record(z.string(), z.string()),
		schemaOrg: z.json(),
		metaTags: z.array(z.strictObject({
			name: z.string().nullable(),
			property: z.string().nullable(),
			content: z.string().nullable(),
		})),
		wordCount: z.number().int().nonnegative(),
		parseDurationMilliseconds: z.number().nonnegative(),
	}),
	rendering: z.strictObject({
		title: z.string().min(1),
		fileName: z.string().min(1),
		artifactType: ArtifactTypeSchema.nullable(),
		templateId: z.string().min(1),
		templateName: z.string().min(1),
		templateContext: z.string(),
		templateHash: HashSchema,
		properties: z.array(z.strictObject({
			name: z.string().min(1),
			type: ValueKindSchema.nullable(),
			value: z.string(),
		})),
	}),
	location: LocationSchema,
	resources: z.array(z.strictObject({
		name: z.string().min(1),
		mediaType: z.string().min(1),
		bytesBase64: z.string(),
		sha256: z.string().regex(/^[a-f0-9]{64}$/),
	})),
});

export const CaptureAckSchema = z.discriminatedUnion('ok', [
	z.strictObject({
		schemaVersion: z.literal('1'),
		ok: z.literal(true),
		identity: z.string().min(1),
		destination: z.string().min(1),
	}),
	z.strictObject({
		schemaVersion: z.literal('1'),
		ok: z.literal(false),
		code: z.string().min(1),
		message: z.string().min(1),
		retryable: z.boolean(),
	}),
]);

export type Location = z.infer<typeof LocationSchema>;
export type Capture = z.infer<typeof CaptureSchema>;
export type CaptureAck = z.infer<typeof CaptureAckSchema>;

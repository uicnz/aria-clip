import { z } from 'zod';

export const MAX_ARTIFACT_TYPE_LENGTH = 80;

export const ArtifactTypeSchema = z.string()
	.min(1)
	.max(MAX_ARTIFACT_TYPE_LENGTH)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Artifact types must be lowercase kebab-case');

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

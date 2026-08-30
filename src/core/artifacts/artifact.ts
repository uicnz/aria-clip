import type { Property } from '../../types/types.js';
import { ArtifactTypeSchema, MAX_ARTIFACT_TYPE_LENGTH } from '../../schemas/artifact.js';

export { MAX_ARTIFACT_TYPE_LENGTH };

export function isValidArtifactType(value: string): boolean {
	return ArtifactTypeSchema.safeParse(value).success;
}

export function addInterpretationArtifactMetadata(properties: Property[], artifactType?: string): Property[] {
	if (!artifactType) return properties;

	const artifactMetadata: Property[] = [
		{ name: 'artifact', value: 'interpretation', type: 'text' },
		{ name: 'artifactType', value: artifactType, type: 'text' },
	];
	const names = new Set(artifactMetadata.map(property => property.name));
	const output = properties.filter(property => !names.has(property.name));
	const tagsIndex = output.findIndex(property => property.name === 'tags');
	const insertAt = tagsIndex < 0 ? output.length : tagsIndex;
	output.splice(insertAt, 0, ...artifactMetadata);
	return output;
}

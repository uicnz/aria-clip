import type { Property } from '../types/types.js';

export const MAX_ARTIFACT_TYPE_LENGTH = 80;

export function isValidArtifactType(value: string): boolean {
	return value.length <= MAX_ARTIFACT_TYPE_LENGTH
		&& /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
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

import { describe, expect, test } from 'bun:test';

import type { Property } from '../../types/types.js';
import { addInterpretationArtifactMetadata, isValidArtifactType } from './artifact.js';

const properties: Property[] = [
	{ name: 'title', value: 'Example', type: 'text' },
	{ name: 'tags', value: 'clips', type: 'multitext' },
];

describe('interpretation artifact metadata', () => {
	test('accepts portable lowercase taxonomy slugs', () => {
		expect(isValidArtifactType('video-notes')).toBe(true);
		expect(isValidArtifactType('Video Notes')).toBe(false);
		expect(isValidArtifactType('video.notes')).toBe(false);
		expect(isValidArtifactType('type-'.repeat(20))).toBe(false);
	});

	test('leaves an ordinary capture unchanged', () => {
		expect(addInterpretationArtifactMetadata(properties)).toBe(properties);
	});

	test('records the artifact kind immediately before tags', () => {
		expect(addInterpretationArtifactMetadata(properties, 'video-notes')).toEqual([
		{ name: 'title', value: 'Example', type: 'text' },
		{ name: 'artifact', value: 'interpretation', type: 'text' },
		{ name: 'artifactType', value: 'video-notes', type: 'text' },
		{ name: 'tags', value: 'clips', type: 'multitext' },
	]);
	});

	test('replaces stale artifact fields instead of duplicating them', () => {
		expect(addInterpretationArtifactMetadata([
			{ name: 'artifact', value: 'old', type: 'text' },
			{ name: 'artifactType', value: 'old-type', type: 'text' },
			...properties,
		], 'page-summary')).toEqual([
			{ name: 'title', value: 'Example', type: 'text' },
			{ name: 'artifact', value: 'interpretation', type: 'text' },
			{ name: 'artifactType', value: 'page-summary', type: 'text' },
			{ name: 'tags', value: 'clips', type: 'multitext' },
		]);
	});
});

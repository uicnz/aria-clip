import { beforeEach, describe, expect, test } from 'bun:test';
import { BUILTIN_TEMPLATES } from '../builtin-templates.js';
import { findMatchingTemplate, initializeTriggers } from './triggers.js';

const builtinTemplates = BUILTIN_TEMPLATES.map(definition => definition.create());

beforeEach(() => {
	findMatchingTemplate.clear();
	initializeTriggers(builtinTemplates);
});

describe('builtin template triggers', () => {
	test.each([
		['https://www.youtube.com/watch?v=abc123', 'Video Notes'],
		['https://www.youtube.com/shorts/abc123', 'Video Notes'],
		['https://youtu.be/abc123', 'Video Notes'],
	])('selects Video Notes for %s', async (url, expectedName) => {
		const match = await findMatchingTemplate(url, async () => []);

		expect(match?.name).toBe(expectedName);
	});

	test.each([
		['https://www.nasa.gov/news-release/example/', 'News Brief'],
		['https://www.allrecipes.com/recipe/10813/example/', 'Recipe Card'],
		['https://www.eventbrite.com/e/example-tickets-123', 'Event Details'],
	])('uses an unambiguous site path for %s', async (url, expectedName) => {
		const match = await findMatchingTemplate(url, async () => [
			{ '@type': 'NewsArticle' },
			{ '@type': 'Recipe' },
			{ '@type': 'Event' },
		]);

		expect(match?.name).toBe(expectedName);
	});

	test('selects Paper Notes directly for arXiv HTML without requiring schema data', async () => {
		let schemaRequested = false;
		const match = await findMatchingTemplate('https://arxiv.org/html/1706.03762', async () => {
			schemaRequested = true;
			return [];
		});

		expect(match?.name).toBe('Paper Notes');
		expect(schemaRequested).toBe(false);
	});

	test.each([
		['NewsArticle', 'News Brief'],
		['ScholarlyArticle', 'Paper Notes'],
		['MedicalScholarlyArticle', 'Paper Notes'],
		['Recipe', 'Recipe Card'],
		['HowTo', 'Tutorial Guide'],
		['Product', 'Product Brief'],
		['TouristDestination', 'Travel Guide'],
		['Event', 'Event Details'],
		['SoftwareSourceCode', 'Code Reference'],
	])('selects %s content as %s', async (schemaType, expectedName) => {
		const match = await findMatchingTemplate(
			`https://example.com/${schemaType}`,
			async () => [{ '@type': schemaType }],
		);

		expect(match?.name).toBe(expectedName);
	});

	test('leaves ambiguous articles on the default template', async () => {
		const match = await findMatchingTemplate(
			'https://example.com/article',
			async () => [{ '@type': 'Article' }, { '@type': 'Person' }],
		);

		expect(match).toBeUndefined();
	});
});

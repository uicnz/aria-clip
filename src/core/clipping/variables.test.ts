import { describe, expect, it } from 'bun:test';
import { buildVariableCatalog, CANONICAL_VARIABLE_NAMES } from './variables.js';

function baseParams() {
	return {
		title: 'Example Page',
		author: '',
		content: '# Markdown',
		contentHtml: '<h1>Markdown</h1>',
		url: 'https://example.com/article',
		fullHtml: '<html></html>',
		description: '',
		favicon: '',
		image: '',
		published: '',
		site: '',
		language: '',
		wordCount: 42,
	};
}

describe('buildVariableCatalog', () => {
	it('is the source of the legacy template variable record', () => {
		const catalog = buildVariableCatalog(baseParams());

		expect(catalog.values['{{title}}']).toBe('Example Page');
		expect(catalog.values['{{content}}']).toBe('# Markdown');
		expect(catalog.entries.find(entry => entry.name === 'words')).toMatchObject({
			kind: 'number',
			origin: 'computed',
			canonical: true,
		});
	});

	it('marks large source payloads so consumers can avoid rendering them', () => {
		const catalog = buildVariableCatalog(baseParams());
		const content = catalog.entries.find(entry => entry.name === 'content');

		expect(content).toMatchObject({ large: true, inspectable: false, kind: 'markdown' });
	});

	it('fills canonical values from structured data when extraction is empty', () => {
		const catalog = buildVariableCatalog({
			...baseParams(),
			schemaOrgData: [{
				'@type': 'NewsArticle',
				author: [{ '@type': 'Person', name: 'Ada Lovelace' }],
				description: 'A structured description',
				datePublished: '2026-08-30',
				image: { '@type': 'ImageObject', contentUrl: 'https://example.com/image.webp' },
				publisher: { '@type': 'Organization', name: 'Example News' },
				inLanguage: 'en-NZ',
			}],
		});

		expect(catalog.values['{{author}}']).toBe('Ada Lovelace');
		expect(catalog.values['{{description}}']).toBe('A structured description');
		expect(catalog.values['{{published}}']).toBe('2026-08-30');
		expect(catalog.values['{{image}}']).toBe('https://example.com/image.webp');
		expect(catalog.values['{{site}}']).toBe('Example News');
		expect(catalog.values['{{language}}']).toBe('en-NZ');
	});

	it('rejects a weekday label and uses the structured event date', () => {
		const catalog = buildVariableCatalog({
			...baseParams(),
			published: 'Thursday',
			schemaOrgData: [{ '@type': 'Event', startDate: '2026-10-01T10:00:00+03:00' }],
		});

		expect(catalog.values['{{published}}']).toBe('2026-10-01T10:00:00+03:00');
	});

	it('retains schema containers for compatibility but exposes typed leaves for inspection', () => {
		const catalog = buildVariableCatalog({
			...baseParams(),
			schemaOrgData: [{
				'@type': 'NewsArticle',
				headline: 'Catalog story',
				author: [{ '@type': 'Person', name: 'Grace Hopper' }],
			}],
		});
		const root = catalog.entries.find(entry => entry.name === 'schema:@NewsArticle:');
		const author = catalog.entries.find(entry => entry.name === 'schema:@NewsArticle:author[0].name');

		expect(root).toMatchObject({ kind: 'json', inspectable: false, schemaType: '@NewsArticle' });
		expect(author).toMatchObject({
			value: 'Grace Hopper',
			origin: 'schema',
			inspectable: true,
			schemaType: '@NewsArticle',
			schemaPath: 'author[0].name',
		});
	});
});

describe('canonical variable definitions', () => {
	it('includes generated note names and interpreter outputs', () => {
		expect(CANONICAL_VARIABLE_NAMES.has('noteName')).toBe(true);
		expect(CANONICAL_VARIABLE_NAMES.has('modelProvider')).toBe(true);
	});
});

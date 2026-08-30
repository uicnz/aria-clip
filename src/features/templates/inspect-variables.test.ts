import { describe, expect, test } from 'bun:test';
import { buildInspectableVariables } from './inspect-variables.js';
import { buildVariableCatalog } from '../../core/clipping/variables.js';

describe('buildInspectableVariables', () => {
	test('excludes large content payloads from the inspector', () => {
		const items = buildInspectableVariables({
			'{{content}}': 'long markdown',
			'{{contentHtml}}': '<p>long HTML</p>',
			'{{fullHtml}}': '<html>complete page</html>',
			'{{title}}': 'Example',
		});

		expect(items.map(item => item.name)).toEqual(['title']);
	});

	test('groups page, metadata, and schema variables', () => {
		const items = buildInspectableVariables({
			'{{title}}': 'Example',
			'{{meta:name:description}}': 'Description',
			'{{schema:@Article:headline}}': 'Example headline',
		});

		expect(items.map(item => [item.name, item.group])).toEqual([
			['title', 'page'],
			['meta:name:description', 'meta'],
			['schema:@Article:headline', 'schema'],
		]);
	});

	test('removes redundant schema objects while retaining leaf values', () => {
		const items = buildInspectableVariables({
			'{{schema:@Article:author}}': '[{"name":"Ada"}]',
			'{{schema:@Article:author[0]}}': '{"name":"Ada"}',
			'{{schema:@Article:author[0].name}}': 'Ada',
			'{{schema:@Article:keywords}}': '["ai","research"]',
		});

		expect(items.map(item => item.name)).toEqual([
			'schema:@Article:author[0].name',
			'schema:@Article:keywords',
		]);
		expect(items[1]?.preview).toBe('ai, research');
	});

	test('uses compact previews without changing the copied variable', () => {
		const value = 'x'.repeat(300);
		const [item] = buildInspectableVariables({ '{{description}}': value });

		expect(item?.variable).toBe('{{description}}');
		expect(item?.preview.length).toBe(160);
		expect(item?.preview.endsWith('…')).toBe(true);
	});

	test('uses typed catalog metadata instead of re-parsing schema values', () => {
		const catalog = buildVariableCatalog({
			title: 'Example', author: '', content: '# Hidden', contentHtml: '<h1>Hidden</h1>',
			url: 'https://example.com', fullHtml: '<html></html>', description: '', favicon: '', image: '',
			published: '', site: '', language: '', wordCount: 1,
			schemaOrgData: [{ '@type': 'NewsArticle', author: [{ '@type': 'Person', name: 'Ada' }] }],
		});
		const items = buildInspectableVariables(catalog.values, catalog);
		const author = items.find(item => item.name === 'schema:@NewsArticle:author[0].name');

		expect(items.some(item => item.name === 'content')).toBe(false);
		expect(author).toMatchObject({
			group: 'schema',
			entity: '@NewsArticle',
			displayName: 'author[0].name',
			preview: 'Ada',
		});
	});
});

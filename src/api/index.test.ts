import '@/test/dom.js';
import { describe, expect, test } from 'bun:test';
import { clip, type DocumentParser } from './index.js';
import type { Template } from '../types/types.js';

const documentParser: DocumentParser = {
	parseFromString(html: string) {
		return new DOMParser().parseFromString(html, 'text/html');
	},
};

const template: Template = {
	id: 'test-default',
	name: 'Default',
	behavior: 'create',
	noteNameFormat: '{{title}}',
	path: 'Clips',
	noteContentFormat: '{{content}}',
	properties: [
		{ name: 'title', value: '{{title}}', type: 'text' },
		{ name: 'source', value: '{{url}}', type: 'text' },
	],
};

describe('clip API', () => {
	test('passes the complete document to Defuddle', async () => {
		const html = `<!doctype html>
			<html lang="en">
				<head>
					<title>A complete document</title>
					<meta name="author" content="Ada Lovelace">
				</head>
				<body>
					<main>
						<article>
							<h1>A complete document</h1>
							<p>This paragraph proves that readable article content survives headless extraction.</p>
						</article>
					</main>
				</body>
			</html>`;

		const result = await clip({
			html,
			url: 'https://example.com/complete-document',
			template,
			documentParser,
		});

		expect(result.noteName).toBe('a-complete-document');
		expect(result.properties).toEqual([
			{ name: 'title', value: 'A complete document', type: 'text' },
			{ name: 'source', value: 'https://example.com/complete-document', type: 'text' },
		]);
		expect(result.content).toContain('readable article content survives headless extraction');
	});
});

import { describe, expect, test } from 'vitest';

import { formatMarkdownImage, normalizeMarkdownOutput } from './markdown-output';

describe('Markdown output normalization', () => {
	test('fills missing image alt text from the file extension and encloses its path', () => {
		expect(normalizeMarkdownOutput('![](https://example.com/photo.JPG?size=2)'))
			.toBe('![jpg](<https://example.com/photo.JPG?size=2>)\n');
	});

	test('uses image when the source has no file extension', () => {
		expect(normalizeMarkdownOutput('![](https://www.youtube.com/watch?v=abc)'))
			.toBe('![image](<https://www.youtube.com/watch?v=abc>)\n');
	});

	test('preserves existing alt text and optional titles', () => {
		expect(normalizeMarkdownOutput('![Diagram](diagram.svg "Architecture")'))
			.toBe('![Diagram](<diagram.svg> "Architecture")\n');
	});

	test('encloses bare URLs without changing frontmatter, links, or code', () => {
		const markdown = [
			'---',
			'source: "https://example.com/source"',
			'---',
			'Project: https://example.com/project',
			'[Documentation](https://example.com/docs)',
			'`https://example.com/inline`',
			'```text',
			'https://example.com/fenced',
			'```',
		].join('\n');

		expect(normalizeMarkdownOutput(markdown)).toBe([
			'---',
			'source: "https://example.com/source"',
			'---',
			'Project: <https://example.com/project>',
			'[Documentation](<https://example.com/docs>)',
			'`https://example.com/inline`',
			'```text',
			'https://example.com/fenced',
			'```',
			'',
		].join('\n'));
	});

	test('adds or repairs HTML image alt attributes', () => {
		expect(normalizeMarkdownOutput('<img src="chart.png"><img src="map.svg" alt="">'))
			.toBe('<img src="chart.png" alt="png"><img src="map.svg" alt="svg">\n');
	});

	test('ends with exactly one newline and is idempotent', () => {
		const once = normalizeMarkdownOutput('Visit https://example.com\n\n\n');
		expect(once).toBe('Visit <https://example.com>\n');
		expect(normalizeMarkdownOutput(once)).toBe(once);
	});

	test('formats image-filter output with a fallback label', () => {
		expect(formatMarkdownImage('image (1).png')).toBe('![png](<image (1).png>)');
	});
});

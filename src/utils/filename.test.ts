import { describe, expect, test } from 'vitest';

import { createMarkdownFilename, sanitizeFilename } from './filename';

describe('portable note filenames', () => {
	test('uses lowercase words separated by dashes', () => {
		expect(sanitizeFilename('This Open Source Tool Makes AI Models 3x Faster (FreeToken)'))
			.toBe('this-open-source-tool-makes-ai-models-3x-faster-freetoken');
	});

	test('normalizes case and accents while retaining letters from other scripts', () => {
		expect(sanitizeFilename('ÉTÉ 東京 ПрИвЕт')).toBe('ete-東京-привет');
	});

	test('removes punctuation, emoji, path separators, and repeated whitespace', () => {
		expect(sanitizeFilename('  A/B: C 🌍 — D?  ')).toBe('a-b-c-d');
	});

	test('avoids reserved Windows device names', () => {
		expect(sanitizeFilename('CON')).toBe('file-con');
		expect(sanitizeFilename('LPT9')).toBe('file-lpt9');
	});

	test('falls back for a name without letters or numbers', () => {
		expect(sanitizeFilename('🌍 /:*?')).toBe('untitled');
	});

	test('creates one lowercase Markdown extension', () => {
		expect(createMarkdownFilename('My Note.MD')).toBe('my-note.md');
	});

	test('stays within a portable UTF-8 filename budget', () => {
		const filename = createMarkdownFilename('界'.repeat(200));
		expect(new TextEncoder().encode(filename).length).toBeLessThanOrEqual(243);
	});
});

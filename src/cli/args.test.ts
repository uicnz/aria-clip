import { describe, expect, test } from 'bun:test';
import { RunOptsSchema, UrlSchema } from './args.js';

describe('CLI arguments', () => {
	test('applies safe defaults', () => {
		expect(RunOptsSchema.parse({})).toMatchObject({
			add: false,
			allowPrivateNetwork: false,
			dryRun: false,
			include: [],
			json: false,
			jsonl: false,
			overwrite: false,
			timeout: 30_000,
		});
	});

	test('rejects output and delivery conflicts before execution', () => {
		expect(() => RunOptsSchema.parse({ json: true, jsonl: true })).toThrow();
		expect(() => RunOptsSchema.parse({ html: '-', input: '-' })).toThrow();
		expect(() => RunOptsSchema.parse({ save: true, add: true })).toThrow();
		expect(() => RunOptsSchema.parse({ to: 'stdout', save: true })).toThrow();
	});

	test('limits include fields and URLs to the public protocol', () => {
		expect(RunOptsSchema.parse({ include: ['source', 'variables', 'trace'] }).include)
			.toEqual(['source', 'variables', 'trace']);
		expect(() => RunOptsSchema.parse({ include: ['html'] })).toThrow();
		expect(UrlSchema.parse('https://example.com/path')).toBe('https://example.com/path');
		expect(() => UrlSchema.parse('file:///tmp/page.html')).toThrow();
	});
});

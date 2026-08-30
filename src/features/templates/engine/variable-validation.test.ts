import { describe, expect, it } from 'bun:test';
import { parse, validateVariables } from './parser.js';

function warningsFor(template: string): string[] {
	const result = parse(template);
	return validateVariables(result.ast).map(warning => warning.message);
}

describe('template variable validation', () => {
	it('uses the shared canonical catalog, including noteName', () => {
		expect(warningsFor('{{noteName}}')).toEqual([]);
	});

	it('accepts complete dynamic variables', () => {
		expect(warningsFor('{{schema:@NewsArticle:headline}} {{meta:property:og:title}}')).toEqual([]);
	});

	it('rejects incomplete dynamic namespaces', () => {
		expect(warningsFor('{{schema:}}')).toContain('Incomplete variable "schema:"');
		expect(warningsFor('{{meta:}}')).toContain('Incomplete variable "meta:"');
	});
});

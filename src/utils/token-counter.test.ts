// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { countTokens, updateTokenCount } from './token-counter';

describe('token counter approximation', () => {
	test('estimates one token per three characters, rounded up', () => {
		expect(countTokens('')).toBe(0);
		expect(countTokens('abc')).toBe(1);
		expect(countTokens('abcd')).toBe(2);
	});

	test('marks the displayed value as approximate', () => {
		const display = document.createElement('span');

		updateTokenCount('sixsix', display);

		expect(display.textContent).toBe('~2 tokens');
	});

	test('applies the existing warning thresholds', () => {
		const display = document.createElement('span');

		updateTokenCount('a'.repeat(4503), display);
		expect(display.classList).toContain('warning');
		expect(display.classList).not.toContain('error');

		updateTokenCount('a'.repeat(7503), display);
		expect(display.classList).toContain('warning');
		expect(display.classList).toContain('error');
	});
});

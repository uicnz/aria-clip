import { describe, expect, test } from 'bun:test';
import { ARIA_MISSING_MESSAGE, ariaFailure } from './aria-clip-delivery.js';

describe('Aria DeepLink browser delivery', () => {
	test.each([
		'Specified native messaging host not found.',
		'Native host has exited.',
		'No such native application nz.uic.aria.deeplink',
	])('reports a missing or exited host (%s) as an Aria install problem', raw => {
		const mapped = ariaFailure(new Error(raw));
		expect(mapped).toBeInstanceOf(Error);
		expect((mapped as Error).message).toBe(ARIA_MISSING_MESSAGE);
	});

	test('keeps other native messaging errors unchanged', () => {
		const error = new Error('Error when communicating with the native messaging host.');
		expect(ariaFailure(error)).toBe(error);
	});
});

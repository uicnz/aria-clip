import { describe, expect, test } from 'bun:test';
import { ARIA_MISSING_MESSAGE, ariaFailure } from './aria-clip-delivery.js';

describe('Aria DeepLink browser delivery', () => {
	test.each([
		'Specified native messaging host not found.',
		"Can't find native messaging host nz.uic.aria.deeplink",
		'No such native application nz.uic.aria.deeplink',
	])('reports an unregistered host (%s) as an integration setup problem', raw => {
		const mapped = ariaFailure(new Error(raw));
		expect(mapped).toBeInstanceOf(Error);
		expect((mapped as Error).message).toBe(ARIA_MISSING_MESSAGE);
	});

	test('keeps other native messaging errors unchanged', () => {
		const error = new Error('Error when communicating with the native messaging host.');
		expect(ariaFailure(error)).toBe(error);
		const exited = new Error('Native host has exited.');
		expect(ariaFailure(exited)).toBe(exited);
	});
});

import { describe, expect, test } from 'bun:test';
import { ensureInterpreterDataConsent, INTERPRETER_DATA_COLLECTION, InterpreterDataConsentError, type DataConsentPermissions } from './firefox-data-consent.js';

function permissions(overrides: Partial<DataConsentPermissions> = {}): DataConsentPermissions {
	return {
		getAll: async () => ({ data_collection: [] }),
		request: async () => false,
		...overrides,
	};
}

describe('Firefox Interpreter data consent', () => {
	test('does nothing outside Firefox', async () => {
		let requested = false;
		await ensureInterpreterDataConsent(true, {
			firefox: false,
			permissions: permissions({ request: async () => {
				requested = true;
				return true;
			} }),
		});
		expect(requested).toBe(false);
	});

	test('requires every transmitted data class before an automatic run', async () => {
		await expect(ensureInterpreterDataConsent(false, {
			firefox: true,
			permissions: permissions({ getAll: async () => ({ data_collection: ['websiteContent', 'browsingActivity'] }) }),
		})).rejects.toBeInstanceOf(InterpreterDataConsentError);
	});

	test('requests the complete disclosure from an explicit Interpreter action', async () => {
		let request: { data_collection: readonly string[] } | undefined;
		await ensureInterpreterDataConsent(true, {
			firefox: true,
			permissions: permissions({ request: async value => {
				request = value;
				return true;
			} }),
		});
		expect(request).toEqual({ data_collection: INTERPRETER_DATA_COLLECTION });
	});
});

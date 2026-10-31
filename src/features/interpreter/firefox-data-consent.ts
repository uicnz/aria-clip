import browser from '../../platform/browser/browser-polyfill.js';

export const INTERPRETER_DATA_COLLECTION = ['websiteContent', 'browsingActivity', 'authenticationInfo'] as const;

type DataCollectionPermission = typeof INTERPRETER_DATA_COLLECTION[number];

export type DataConsentPermissions = {
	getAll(): Promise<{ data_collection?: readonly string[] }>;
	request(request: { data_collection: readonly DataCollectionPermission[] }): Promise<boolean>;
};

export class InterpreterDataConsentError extends Error {
	constructor() {
		super('Allow Aria Clip to send page content, page addresses, and your provider credential to the selected provider before running Interpreter.');
		this.name = 'InterpreterDataConsentError';
	}
}

function firefox(): boolean {
	return /firefox/i.test(navigator.userAgent);
}

function consentPermissions(): DataConsentPermissions {
	return browser.permissions as unknown as DataConsentPermissions;
}

function granted(dataCollection: readonly string[] | undefined): boolean {
	return INTERPRETER_DATA_COLLECTION.every(permission => dataCollection?.includes(permission));
}

/**
 * Firefox requires a distinct, user-controlled consent before Interpreter can
 * transmit a page and the user's provider credential. The request branch is
 * only used from an explicit Interpreter button click; automatic runs merely
 * verify that consent already exists.
 */
export async function ensureInterpreterDataConsent(
	request: boolean,
	options: { firefox?: boolean; permissions?: DataConsentPermissions } = {},
): Promise<void> {
	if (!(options.firefox ?? firefox())) return;

	const permissions = options.permissions ?? consentPermissions();
	if (request) {
		if (await permissions.request({ data_collection: INTERPRETER_DATA_COLLECTION })) return;
		throw new InterpreterDataConsentError();
	}

	const current = await permissions.getAll();
	if (!granted(current.data_collection)) throw new InterpreterDataConsentError();
}

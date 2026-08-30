import browser from './browser-polyfill.js';

export type RuntimeMessageListener = (
	message: unknown,
	sender: browser.Runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => true | undefined;

/**
 * Preserve the callback-style WebExtension listener contract supported by
 * Chromium, Firefox, and Safari. The current polyfill types omit the valid
 * no-response return from three-argument callback listeners.
 */
export function addRuntimeMessageListener(listener: RuntimeMessageListener): void {
	browser.runtime.onMessage.addListener(
		listener as unknown as browser.Runtime.OnMessageListener,
	);
}

export function removeRuntimeMessageListener(listener: RuntimeMessageListener): void {
	browser.runtime.onMessage.removeListener(
		listener as unknown as browser.Runtime.OnMessageListener,
	);
}

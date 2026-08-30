import { Reader } from '../features/reader/reader.js';
import browser from '../platform/browser/browser-polyfill.js';
import { addRuntimeMessageListener } from '../platform/browser/runtime-messaging.js';

// Initialize reader mode
(function() {
	// Check if the script has already been initialized
	if (window.hasOwnProperty('ariaReaderInitialized')) {
		return;  // Exit if already initialized
	}

	// Mark as initialized
	(window as any).ariaReaderInitialized = true;

	// Listen for messages from the content script
	addRuntimeMessageListener((request: any, _sender, sendResponse) => {
		if (request.action === "toggleReaderMode") {
			// When deactivating, respond before restore triggers a page reload
			if (document.documentElement.classList.contains('aria-reader-active')) {
				sendResponse({ success: true, isActive: false });
				Reader.toggle(document);
				return;
			}
			(async () => {
				try {
					const isActive = await Reader.toggle(document);
					document.documentElement.classList.toggle('aria-reader-active', isActive);
					browser.runtime.sendMessage({ action: "readerModeChanged", isActive });
					sendResponse({ success: true, isActive });
				} catch (error: unknown) {
					console.error('Error toggling reader mode:', error);
					sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
				}
			})();
			return true;
		}
		return undefined;
	});
})();

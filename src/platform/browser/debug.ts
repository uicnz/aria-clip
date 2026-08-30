import browser from './browser-polyfill.js';
import {
	debugLog,
	isDebugMode,
	setDebugMode,
} from '../../shared/logging/debug.js';

declare const DEBUG_MODE: boolean | undefined;

const buildAllowsDebug = typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE;

// Initialize debug mode from storage only in debug mode
if (buildAllowsDebug) {
	browser.storage.local.get('debugMode').then((result: { debugMode?: boolean }) => {
		setDebugMode(result.debugMode ?? false);
		console.log(`Debug mode initialized to: ${isDebugMode() ? 'ON' : 'OFF'}`);
	}).catch((error) => {
		console.error('Error initializing debug mode:', error);
	});
}

export const toggleDebug = (filterName: string): void => {
	if (!buildAllowsDebug) return;
	setDebugMode(!isDebugMode());
	// Save the new state to storage
	browser.storage.local.set({ debugMode: isDebugMode() }).then(() => {
		console.log(`${filterName} debug mode is now ${isDebugMode() ? 'ON' : 'OFF'}`);
	}).catch((error) => {
		console.error('Error saving debug mode:', error);
	});
};

export { debugLog, isDebugMode };

// Expose toggleDebug to the global scope only in debug mode
if (buildAllowsDebug) {
	Object.assign(globalThis, { toggleDebug });
}

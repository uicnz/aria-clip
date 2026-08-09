import browser from './browser-polyfill.js';
import { sanitizeFileName } from '../utils/string-utils.js';
import { generateFrontmatter as generateFrontmatterCore } from './shared.js';
import { Template, Property } from '../types/types.js';
import { generalSettings } from './storage-utils.js';
import { copyToClipboard } from './clipboard-utils.js';
import { getMessage } from './i18n.js';

export async function generateFrontmatter(properties: Property[]): Promise<string> {
	const typeMap: Record<string, string> = {};
	for (const pt of generalSettings.propertyTypes) {
		typeMap[pt.name] = pt.type;
	}
	return generateFrontmatterCore(properties, typeMap);
}

function openAriaUrl(url: string): void {
	browser.runtime.sendMessage({
		action: "openAriaUrl",
		url: url
	}).catch((error) => {
		console.error('Error opening Aria URL via background script:', error);
		window.open(url, '_blank');
	});
}

async function tryClipboardWrite(fileContent: string, ariaUrl: string): Promise<void> {
	const success = await copyToClipboard(fileContent);
	
	if (success) {
		// &clipboard tells Aria to read data from clipboard instead of the content param.
		// content is a fallback shown only if Aria can't access the clipboard (e.g. on Linux).
		ariaUrl += `&clipboard&content=${encodeURIComponent(getMessage('clipboardError', 'https://docs.aria.bot/troubleshoot'))}`;
		openAriaUrl(ariaUrl);
		console.log('Aria URL:', ariaUrl);
	} else {
		console.error('All clipboard methods failed, falling back to URI method');
		// Final fallback: use URI method with actual content (same as legacy mode)
		// Note: We don't add &clipboard here since we're bypassing the clipboard entirely
		ariaUrl += `&content=${encodeURIComponent(fileContent)}`;
		openAriaUrl(ariaUrl);
		console.log('Aria URL (URI fallback):', ariaUrl);
	}
}

export async function saveToAria(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
): Promise<void> {
	let ariaUrl: string;

	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';

	if (isDailyNote) {
		ariaUrl = `aria://daily?`;
	} else {
		// Ensure path ends with a slash
		if (path && !path.endsWith('/')) {
			path += '/';
		}

		const formattedNoteName = sanitizeFileName(noteName);
		ariaUrl = `aria://new?file=${encodeURIComponent(path + formattedNoteName)}`;
	}

	if (behavior.startsWith('append')) {
		ariaUrl += '&append=true';
	} else if (behavior.startsWith('prepend')) {
		ariaUrl += '&prepend=true';
	} else if (behavior === 'overwrite') {
		ariaUrl += '&overwrite=true';
	}

	const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : '';
	ariaUrl += vaultParam;

	// Add silent parameter if silentOpen is enabled
	if (generalSettings.silentOpen) {
		ariaUrl += '&silent=true';
	}

	if (generalSettings.legacyMode) {
		// Use the URI method
		ariaUrl += `&content=${encodeURIComponent(fileContent)}`;
		console.log('Aria URL:', ariaUrl);
		openAriaUrl(ariaUrl);
	} else {
		// Try to copy to clipboard with fallback mechanisms
		await tryClipboardWrite(fileContent, ariaUrl);
	}
}

import { parseHTML } from 'linkedom';
import type { DocumentParser } from '../api/index.js';

class Parser {
	parseFromString(html: string): Document {
		return parseDocument(html);
	}
}

export function installDom(): void {
	if (!('window' in globalThis)) {
		Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
	}
	if (!('DOMParser' in globalThis)) {
		Object.defineProperty(globalThis, 'DOMParser', { configurable: true, value: Parser });
	}
	if (!('document' in globalThis)) {
		Object.defineProperty(globalThis, 'document', {
			configurable: true,
			value: parseDocument('<!doctype html><html><head></head><body></body></html>'),
		});
	}
}

export function parseDocument(html: string): Document {
	// linkedom implements the DOM contract but its nominal type is separate.
	return parseHTML(html).document as unknown as Document;
}

export const parser: DocumentParser = {
	parseFromString(html: string): Document {
		return parseDocument(html);
	},
};

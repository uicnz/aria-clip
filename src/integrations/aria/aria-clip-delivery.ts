import browser from '../../platform/browser/browser-polyfill.js';

export const ARIA_CLIP_NATIVE_HOST_NAME = 'nz.uic.aria.clip';

export interface AriaClipCapture {
	version: 1;
	captureId: string;
	capturedAt: string;
	producer: {
		name: 'Aria Clip';
		version: string;
		browser: string;
	};
	source: {
		url: string;
		title: string;
		description: string;
		domain: string;
		site: string;
		author: string;
		published: string;
		language: string;
		favicon: string;
		image: string;
	};
	capture: {
		renderedMarkdown: string;
		articleHtml: string;
		selectedHtml: string;
		cleanedDocumentHtml: string;
		highlights: unknown[];
		extractedContent: Record<string, string>;
		extractedVariables: Record<string, string>;
		schemaOrg: unknown;
		metaTags: Array<{ name: string | null; property: string | null; content: string | null }>;
		wordCount: number;
		parseDurationMilliseconds: number;
	};
	rendering: {
		title: string;
		artifactType: string | null;
		templateId: string;
		templateName: string;
		templateContext: string;
		properties: Array<{ name: string; type: string | null; value: string }>;
	};
	resources: Array<{
		name: string;
		mediaType: string;
		bytesBase64: string;
		sha256: string;
	}>;
}

type AriaClipNativeResponse =
	| {
			ok: true;
			result:
				| { status: 'accepted'; sessionId: string }
				| { status: 'failed'; code: string; retryable: boolean };
	  }
	| { ok: false; message: string };

export async function deliverCaptureToAria(capture: AriaClipCapture): Promise<void> {
	const response = (await browser.runtime.sendNativeMessage(ARIA_CLIP_NATIVE_HOST_NAME, {
		operation: 'capture.deliver',
		capture,
	})) as AriaClipNativeResponse | null;
	if (!response?.ok) throw new Error(response?.message || 'Aria could not receive this capture.');
	const result = response.result;
	if (!result) throw new Error('Aria returned an incomplete capture acknowledgement.');
	if (result.status === 'failed') {
		throw new Error(`Aria rejected this capture (${result.code}).`);
	}
}

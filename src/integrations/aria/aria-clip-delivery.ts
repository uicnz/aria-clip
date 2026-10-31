import browser from '../../platform/browser/browser-polyfill.js';
import { CaptureAckSchema, sessionStart, type Capture } from '../../schemas/capture.js';

export const ARIA_CLIP_NATIVE_HOST_NAME = 'nz.uic.aria.deeplink';

export const ARIA_MISSING_MESSAGE = 'Aria’s browser connection is not registered. Install or repair the Aria integration.';

export type AriaClipCapture = Capture;

/** Browser errors that mean the DeepLink host is not registered. */
const MISSING_HOST = [
	/specified native messaging host not found/i,
	/can't find native messaging host/i,
	/no such native application/i,
];

/** Replace the browser's raw missing-host error with a user-actionable message; keep every other error. */
export function ariaFailure(error: unknown): unknown {
	const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
	return MISSING_HOST.some(pattern => pattern.test(message)) ? new Error(ARIA_MISSING_MESSAGE) : error;
}

export async function deliverCaptureToAria(capture: AriaClipCapture): Promise<void> {
	const request = sessionStart(capture);
	let response: unknown;
	try {
		response = await browser.runtime.sendNativeMessage(ARIA_CLIP_NATIVE_HOST_NAME, request);
	} catch (error) {
		throw ariaFailure(error);
	}
	const ack = CaptureAckSchema.parse(response);
	if (!ack.ok) throw new Error(`${ack.message} (${ack.code})`);
}

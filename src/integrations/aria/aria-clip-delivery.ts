import browser from '../../platform/browser/browser-polyfill.js';
import { CaptureAckSchema, CaptureSchema, type Capture } from '../../schemas/capture.js';

export const ARIA_CLIP_NATIVE_HOST_NAME = 'nz.uic.aria.clip';

export type AriaClipCapture = Capture;

export async function deliverCaptureToAria(capture: AriaClipCapture): Promise<void> {
	const response: unknown = await browser.runtime.sendNativeMessage(ARIA_CLIP_NATIVE_HOST_NAME, {
		operation: 'capture.deliver',
		capture: CaptureSchema.parse(capture),
	});
	const ack = CaptureAckSchema.parse(response);
	if (!ack.ok) throw new Error(`${ack.message} (${ack.code})`);
}

#!/usr/bin/env bun
import { writeFile } from 'node:fs/promises';
import { frame, unframe } from '../../integrations/aria/cli-delivery.js';
import { CaptureSchema } from '../../schemas/capture.js';

const args = process.argv.slice(2);
if (args[0] === '--version') {
	process.stdout.write('aria 9.9.9\n');
	process.exit(0);
}
if (args.join(' ') !== '--deeplink') process.exit(2);

const request = unframe(Buffer.from(await new Response(Bun.stdin.stream()).arrayBuffer()));
if (!request || typeof request !== 'object' || !('operation' in request) || request.operation !== 'session.start' || !('capture' in request)) process.exit(3);
const capture = CaptureSchema.parse(request.capture);
if (process.env.ARIA_CLIP_FAKE_FAILURE) {
	process.stdout.write(frame({ schemaVersion: '1', ok: false, code: 'internalError', message: 'The clip Session could not be shown.', retryable: false }));
	process.exit(1);
}
const record = process.env.ARIA_CLIP_FAKE_RECORD;
if (record) await writeFile(record, `${JSON.stringify(capture, null, 2)}\n`);
process.stdout.write(frame({
	schemaVersion: '1',
	ok: true,
	sessionId: `session:${capture.captureId}`,
	filepath: `${capture.location.vault || 'default'}/${capture.location.folder}/${capture.rendering.fileName}`,
}));

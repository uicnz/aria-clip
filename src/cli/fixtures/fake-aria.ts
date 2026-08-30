#!/usr/bin/env bun
import { writeFile } from 'node:fs/promises';
import { CaptureSchema } from '../../schemas/capture.js';

const args = process.argv.slice(2);
if (args[0] === '--version') {
	process.stdout.write('aria 9.9.9\n');
	process.exit(0);
}
if (args[0] === '--supports') {
	process.stdout.write(`${args[1] === 'clip.capture.v1'}\n`);
	process.exit(0);
}
if (args.join(' ') !== 'clip add --input - --json') process.exit(2);

const text = await new Response(Bun.stdin.stream()).text();
const capture = CaptureSchema.parse(JSON.parse(text));
const record = process.env.ARIA_CLIP_FAKE_RECORD;
if (record) await writeFile(record, `${JSON.stringify(capture, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
	schemaVersion: '1',
	ok: true,
	identity: `note:${capture.captureId}`,
	destination: `${capture.location.vault || 'default'}/${capture.location.folder}/${capture.rendering.fileName}`,
})}\n`);

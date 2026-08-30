import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'bun:test';
import { capture } from '../../test/capture.js';
import { BehaviorSchema } from '../../schemas/template.js';
import { ariaInfo, sendAria, type AriaRun } from './cli-delivery.js';

const dirs: string[] = [];
const fake = fileURLToPath(new URL('../../cli/fixtures/fake-aria.ts', import.meta.url));
const run: AriaRun = { bin: process.execPath, args: [fake] };

afterEach(async () => {
	delete process.env.ARIA_CLIP_FAKE_RECORD;
	await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('Aria intake', () => {
	test('discovers the versioned capability without launching Aria', async () => {
		await expect(ariaInfo(run)).resolves.toEqual({
			installed: true,
			available: true,
			version: 'aria 9.9.9',
		});
	});

	test('transmits the complete capture and parses its stable acknowledgement', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-fake-'));
		dirs.push(root);
		const record = join(root, 'capture.json');
		process.env.ARIA_CLIP_FAKE_RECORD = record;
		const input = capture('# Complete\n', 'complete.md');
		input.location.folder = 'Clips/Papers';
		input.location.vault = 'Research';
		const ack = await sendAria(input, 5_000, run);
		const stored = JSON.parse(await readFile(record, 'utf8'));

		expect(ack).toEqual({
			schemaVersion: '1',
			ok: true,
			identity: `note:${input.captureId}`,
			destination: 'Research/Clips/Papers/complete.md',
		});
		expect(stored.location).toEqual(input.location);
		expect(stored.capture.renderedMarkdown).toBe('# Complete\n');
		expect(stored.rendering.fileName).toBe('complete.md');
	});

	test.each(BehaviorSchema.options)('preserves %s Location behavior across the process boundary', async behavior => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-behavior-'));
		dirs.push(root);
		const record = join(root, 'capture.json');
		process.env.ARIA_CLIP_FAKE_RECORD = record;
		const input = capture();
		input.location.behavior = behavior;
		await sendAria(input, 5_000, run);
		const stored = JSON.parse(await readFile(record, 'utf8'));
		expect(stored.location.behavior).toBe(behavior);
	});
});

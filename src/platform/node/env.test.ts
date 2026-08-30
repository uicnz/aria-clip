import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { envPath, loadEnv } from './env.js';

const roots: string[] = [];
const originalHome = process.env.ARIA_HOME;
const originalKey = process.env.ARIA_CLIP_ENV_TEST;

function value(name: string): string | undefined {
	return process.env[name];
}

afterEach(async () => {
	if (originalHome === undefined) delete process.env.ARIA_HOME;
	else process.env.ARIA_HOME = originalHome;
	if (originalKey === undefined) delete process.env.ARIA_CLIP_ENV_TEST;
	else process.env.ARIA_CLIP_ENV_TEST = originalKey;
	await Promise.all(roots.splice(0).map(root => rm(root, { force: true, recursive: true })));
});

describe('Aria environment', () => {
	test('loads only the canonical Aria environment file', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-env-'));
		roots.push(root);
		process.env.ARIA_HOME = root;
		delete process.env.ARIA_CLIP_ENV_TEST;
		await mkdir(root, { recursive: true });
		await Bun.write(join(root, '.env'), 'ARIA_CLIP_ENV_TEST=canonical\n');
		expect(envPath()).toBe(join(root, '.env'));
		expect(loadEnv()).toBe(join(root, '.env'));
		expect(value('ARIA_CLIP_ENV_TEST')).toBe('canonical');
	});

	test('does not replace an explicitly injected variable', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-env-'));
		roots.push(root);
		process.env.ARIA_HOME = root;
		process.env.ARIA_CLIP_ENV_TEST = 'injected';
		await Bun.write(join(root, '.env'), 'ARIA_CLIP_ENV_TEST=canonical\n');
		loadEnv();
		expect(value('ARIA_CLIP_ENV_TEST')).toBe('injected');
	});
});

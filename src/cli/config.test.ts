import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { ConfigSchema, loadConfig, paths, setDefaultModel } from './config.js';

const dirs: string[] = [];
const originalHome = process.env.ARIA_HOME;
const originalModel = process.env.ARIA_CLIP_MODEL;

afterEach(async () => {
	if (originalHome === undefined) delete process.env.ARIA_HOME;
	else process.env.ARIA_HOME = originalHome;
	if (originalModel === undefined) delete process.env.ARIA_CLIP_MODEL;
	else process.env.ARIA_CLIP_MODEL = originalModel;
	await Promise.all(dirs.splice(0).map(path => rm(path, { force: true, recursive: true })));
});

async function home(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), 'aria-clip-config-'));
	dirs.push(path);
	process.env.ARIA_HOME = path;
	delete process.env.ARIA_CLIP_MODEL;
	return path;
}

describe('CLI configuration', () => {
	test('uses ARIA_HOME without trusting the current directory', async () => {
		const root = await home();
		expect(paths()).toEqual({
			home: root,
			config: join(root, 'clip', 'config.json'),
			templates: join(root, 'clip', 'templates'),
		});
	});

	test('writes and reloads one canonical default model', async () => {
		await home();
		await setDefaultModel('openai/gpt-5.6-sol');
		const value = await loadConfig();
		expect(value.defaultModel).toBe('openai/gpt-5.6-sol');
		expect(value.models).toEqual(['openai/gpt-5.6-sol']);
		ConfigSchema.parse(JSON.parse(await readFile(paths().config, 'utf8')));
	});

	test('gives the environment model highest precedence', async () => {
		await home();
		await setDefaultModel('openai/gpt-5.6-sol');
		process.env.ARIA_CLIP_MODEL = 'anthropic/claude-opus-5';
		expect((await loadConfig()).defaultModel).toBe('anthropic/claude-opus-5');
	});
});

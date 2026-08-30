import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { capture } from '../test/capture.js';
import { RunOptsSchema } from './args.js';
import { deliver } from './deliver.js';

const dirs: string[] = [];
const originalHome = process.env.ARIA_HOME;

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(path => rm(path, { force: true, recursive: true })));
	if (originalHome === undefined) delete process.env.ARIA_HOME;
	else process.env.ARIA_HOME = originalHome;
});

async function dir(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), 'aria-clip-delivery-'));
	dirs.push(path);
	return path;
}

describe('CLI file delivery', () => {
	test('uses the rendered template path for bare save', async () => {
		const home = await dir();
		process.env.ARIA_HOME = home;
		const input = capture('# Paper\n', 'attention.paper-notes.md');
		input.location.folder = 'Clips/Papers';
		const path = join(home, 'vault', 'Clips', 'Papers', 'attention.paper-notes.md');
		const result = await deliver({
			capture: input,
			opts: RunOptsSchema.parse({ save: true }),
		});
		expect(result).toMatchObject({ requested: 'file', performed: true, path });
		expect(await readFile(path, 'utf8')).toBe('# Paper\n');
	});

	test('rejects a template path that escapes the Aria vault', async () => {
		const home = await dir();
		process.env.ARIA_HOME = home;
		const input = capture();
		input.location.folder = '../outside';
		await expect(deliver({
			capture: input,
			opts: RunOptsSchema.parse({ save: true }),
		})).rejects.toMatchObject({ detail: { code: 'E_TEMPLATE_INVALID' } });
	});

	test('writes atomically to an explicit destination and returns its hash', async () => {
		const root = await dir();
		const path = join(root, 'note.md');
		const result = await deliver({
			capture: capture('# Durable\n', 'durable.md'),
			opts: RunOptsSchema.parse({ save: path }),
		});
		expect(result).toMatchObject({ requested: 'file', performed: true, path });
		expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(await readFile(path, 'utf8')).toBe('# Durable\n');
	});

	test('refuses a conflict and preserves the existing file', async () => {
		const root = await dir();
		const path = join(root, 'note.md');
		await writeFile(path, 'original');
		await expect(deliver({
			capture: capture('replacement'),
			opts: RunOptsSchema.parse({ save: path }),
		})).rejects.toMatchObject({ detail: { code: 'E_DELIVERY_CONFLICT' } });
		expect(await readFile(path, 'utf8')).toBe('original');
	});

	test('replaces an existing file only when overwrite is explicit', async () => {
		const root = await dir();
		const path = join(root, 'note.md');
		await writeFile(path, 'original');
		const result = await deliver({
			capture: capture('replacement'),
			opts: RunOptsSchema.parse({ save: path, overwrite: true }),
		});
		expect(result).toMatchObject({ requested: 'file', performed: true, path });
		expect(await readFile(path, 'utf8')).toBe('replacement');
	});

	test('dry run resolves file delivery without creating a file', async () => {
		const root = await dir();
		const path = join(root, 'note.md');
		const result = await deliver({
			capture: capture(),
			opts: RunOptsSchema.parse({ save: path, dryRun: true }),
		});
		expect(result).toMatchObject({ requested: 'file', performed: false });
		await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
	});
});

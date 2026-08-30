import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'bun:test';
import { RunOptsSchema } from './args.js';
import { installDom } from './dom.js';
import { Fault } from './fault.js';
import type { run as runClip } from './run.js';

const fixture = fileURLToPath(new URL('../features/templates/engine/fixtures/templates/schema-rich.html', import.meta.url));
const url = 'https://example.com/recipe';

let run: typeof runClip;

beforeAll(async () => {
	installDom();
	({ run } = await import('./run.js'));
});

describe('CLI pipeline', () => {
	test('captures deterministic Markdown with Default and optional internals', async () => {
		const result = await run({
			command: 'capture',
			url,
			opts: RunOptsSchema.parse({
				html: fixture,
				include: ['source', 'variables', 'trace'],
			}),
		});

		expect(result).toMatchObject({
			ok: true,
			command: 'capture',
			input: { source: 'file', requestedUrl: url, finalUrl: url },
			template: { id: 'builtin-default', source: 'default' },
			interpreter: { performed: false, provider: null, model: null },
			delivery: { requested: 'stdout', performed: false },
		});
		expect(result.artifact.fileName).toBe('best-chocolate-cake-recipe.md');
		expect(result.artifact.markdown).toContain('Best Chocolate Cake Recipe');
		expect(result.included?.source).toContain('Chocolate');
		expect(result.included?.variables?.['{{title}}']).toBe('Best Chocolate Cake Recipe');
		expect(result.included?.trace).toMatchObject({ prompts: 0, interpret: false });
	});

	test('auto selects a schema template without contacting a model during dry run', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-config-'));
		const config = join(root, 'config.json');
		await writeFile(config, JSON.stringify({
			schemaVersion: '1',
			defaultModel: 'mock/test-model',
			models: ['mock/test-model'],
			providers: { mock: { api: 'openai', baseUrl: 'https://example.com/v1' } },
		}));
		try {
			const result = await run({
				command: 'auto',
				url,
				opts: RunOptsSchema.parse({ html: fixture, dryRun: true, config }),
			});
			expect(result.template).toMatchObject({ id: 'builtin-recipe-card', source: 'auto' });
			expect(result.interpreter).toMatchObject({ performed: false, provider: 'mock', model: 'test-model' });
			expect(result.warnings).toContain('Dry run: Interpreter call was resolved but not performed.');
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test('interpretive sugar fails clearly when no model is configured', async () => {
		try {
			await run({
				command: 'recipe',
				url,
				opts: RunOptsSchema.parse({ html: fixture }),
			});
			throw new Error('Expected model configuration failure');
		} catch (error) {
			expect(error).toBeInstanceOf(Fault);
			expect(error).toMatchObject({
				detail: { code: 'E_MODEL_NOT_CONFIGURED', stage: 'interpret' },
				exit: 6,
			});
		}
	});

	test('writes a redacted trace without changing the capture result', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-trace-'));
		const path = join(root, 'trace.json');
		try {
			const result = await run({
				command: 'capture',
				url: 'https://user:secret@example.com/recipe?token=private#fragment',
				opts: RunOptsSchema.parse({ html: fixture, trace: path }),
			});
			const raw = await readFile(path, 'utf8');
			const value = JSON.parse(raw);
			expect(result.artifact.markdown).toContain('Best Chocolate Cake Recipe');
			expect(value.source.requestedUrl).toBe('https://example.com/recipe');
			expect(raw).not.toContain('secret');
			expect(raw).not.toContain('private');
			expect(raw).not.toContain('<html');
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test('does not write a requested trace during a dry run', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aria-clip-dry-trace-'));
		const path = join(root, 'trace.json');
		try {
			const result = await run({
				command: 'capture',
				url,
				opts: RunOptsSchema.parse({ html: fixture, trace: path, dryRun: true }),
			});
			expect(result.warnings).toContain('Dry run: trace file was not written.');
			await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

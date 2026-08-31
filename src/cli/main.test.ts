import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';
import { EventSchema, FailureSchema, ResultSchema, SetupResultSchema } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const cli = resolve(here, 'index.ts');
const fixture = resolve(root, 'src/features/templates/engine/fixtures/templates/schema-rich.html');

interface Output {
	code: number;
	stderr: string;
	stdout: string;
}

async function command(args: string[]): Promise<Output> {
	const proc = spawn('bun', ['run', cli, ...args], {
		cwd: root,
		env: { ...process.env, ARIA_HOME: '/tmp/aria-clip-test-home-missing', NO_COLOR: '1' },
	});
	const stdout: Buffer[] = [];
	const stderr: Buffer[] = [];
	proc.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
	proc.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
	const code = await new Promise<number>((resolve, reject) => {
		proc.once('error', reject);
		proc.once('close', value => resolve(value ?? 10));
	});
	return {
		stdout: Buffer.concat(stdout).toString('utf8'),
		stderr: Buffer.concat(stderr).toString('utf8'),
		code,
	};
}

describe('CLI process contracts', () => {
	test('fits top-level help in an 80 by 24 terminal', async () => {
		const result = await command(['--help']);
		expect(result.code).toBe(0);
		expect(result.stderr).toBe('');
		const lines = result.stdout.trimEnd().split('\n');
		expect(lines.length).toBeLessThanOrEqual(23);
		expect(Math.max(...lines.map(line => line.length))).toBeLessThanOrEqual(80);
		expect(result.stdout).toContain('help agent');
	});

	test('explains a semantic sugar without requiring a URL or side effect', async () => {
		const result = await command(['paper', '--explain', '--json']);
		expect(result).toMatchObject({ code: 0, stderr: '' });
		expect(JSON.parse(result.stdout)).toMatchObject({
			command: 'paper',
			template: 'builtin-paper-notes',
			interpret: true,
		});
	});

	test('keeps successful JSON isolated on stdout', async () => {
		const result = await command([
			'capture', 'https://example.com/recipe', '--html', fixture, '--json',
		]);
		expect(result).toMatchObject({ code: 0, stderr: '' });
		ResultSchema.parse(JSON.parse(result.stdout));
	});

	test('preserves machine flags on nested commands', async () => {
		const [templates, models] = await Promise.all([
			command(['templates', 'list', '--json']),
			command(['models', 'list', '--json']),
		]);
		expect(templates).toMatchObject({ code: 0, stderr: '' });
		expect(models).toMatchObject({ code: 0, stderr: '' });
		expect(JSON.parse(templates.stdout)).toMatchObject({ schemaVersion: '1', templates: expect.any(Array) });
		expect(JSON.parse(models.stdout)).toMatchObject({ schemaVersion: '1', models: expect.any(Array) });
	});

	test('reports browser setup without launching in a dry run', async () => {
		const result = await command(['setup', '--dry-run', '--json']);
		expect(result).toMatchObject({ code: 0, stderr: '' });
		const value = SetupResultSchema.parse(JSON.parse(result.stdout));
		expect(value.browsers.map(browser => browser.id)).toEqual(process.platform === 'darwin'
			? ['chrome', 'firefox', 'safari']
			: ['chrome', 'firefox']);
		expect(value.browsers.every(browser => browser.launched === false)).toBe(true);
	});

	test('emits independently valid JSONL events with the result as terminal data', async () => {
		const result = await command([
			'capture', 'https://example.com/recipe', '--html', fixture, '--jsonl',
		]);
		expect(result).toMatchObject({ code: 0, stderr: '' });
		const events = result.stdout.trim().split('\n').map(line => EventSchema.parse(JSON.parse(line)));
		expect(events.map(item => item.event)).toEqual([
			'started', 'fetched', 'extracted', 'matched', 'rendered', 'delivering', 'completed',
		]);
		ResultSchema.parse(events.at(-1)?.data);
	});

	test('returns one stable machine error and a nonzero exit', async () => {
		const result = await command(['capture', 'file:///tmp/private.html', '--json']);
		expect(result.code).toBe(2);
		expect(result.stderr).toBe('');
		expect(FailureSchema.parse(JSON.parse(result.stdout))).toMatchObject({
			error: { code: 'E_URL_INVALID', stage: 'input' },
		});
	});
});
import { spawn } from 'node:child_process';

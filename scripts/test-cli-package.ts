import { chmod, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { ExpansionSchema, ResultSchema, SetupResultSchema } from '../src/cli/schema.js';

const TextResultSchema = z.strictObject({
	code: z.number().int(),
	stdout: z.string(),
	stderr: z.string(),
});

const root = resolve(import.meta.dir, '..');
const pkg = z.strictObject({ version: z.string() }).passthrough().parse(
	await Bun.file(join(root, 'package.json')).json(),
);
const archive = join(root, 'builds', 'npm', `aria-clip-${pkg.version}.tgz`);
const dir = await mkdtemp(join(tmpdir(), 'aria-clip-package-'));

async function run(command: string[], cwd = dir, env: NodeJS.ProcessEnv = process.env) {
	const proc = Bun.spawn(command, { cwd, env, stderr: 'pipe', stdout: 'pipe' });
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return TextResultSchema.parse({ stdout, stderr, code });
}

function ok(result: z.infer<typeof TextResultSchema>, label: string): string {
	if (result.code !== 0) throw new Error(`${label} failed:\n${result.stderr || result.stdout}`);
	return result.stdout;
}

try {
	await Bun.write(join(dir, 'package.json'), '{"private":true}\n');
	ok(await run(['bun', 'add', archive, '--ignore-scripts']), 'clean package installation');

	const packageDir = join(dir, 'node_modules', 'aria-clip');
	const cli = join(packageDir, 'cli.cjs');
	const bin = process.platform === 'win32'
		? join(dir, 'node_modules', '.bin', 'aria-clip.exe')
		: join(dir, 'node_modules', '.bin', 'aria-clip');
	const alias = process.platform === 'win32'
		? join(dir, 'node_modules', '.bin', 'clip.exe')
		: join(dir, 'node_modules', '.bin', 'clip');
	if (process.platform !== 'win32') await chmod(bin, 0o755);
	if (process.platform !== 'win32') await chmod(alias, 0o755);

	const source = await readFile(cli, 'utf8');
	if (!source.startsWith('#!/usr/bin/env bun\n')) throw new Error('Packaged CLI does not use the Bun shebang.');
	if (process.platform !== 'win32' && (((await stat(cli)).mode & 0o111) === 0)) {
		throw new Error('Packaged CLI is not executable.');
	}

	if (ok(await run([bin, '--version']), 'version').trim() !== pkg.version) {
		throw new Error('Packaged CLI version does not match package.json.');
	}
	if (ok(await run([alias, '--version']), 'clip alias version').trim() !== pkg.version) {
		throw new Error('Packaged clip alias version does not match package.json.');
	}
	ExpansionSchema.parse(JSON.parse(ok(await run([alias, 'video', '--explain', '--json']), 'clip video alias')));
	ok(await run([bin, '--help']), 'help');
	ok(await run([bin, 'help', 'agent']), 'agent help');
	ok(await run([bin, 'help', 'templates']), 'template help');
	ok(await run([bin, 'help', 'models']), 'model help');
	JSON.parse(ok(await run([bin, 'describe', '--json']), 'description'));
	JSON.parse(ok(await run([bin, 'capabilities', '--json']), 'capabilities'));
	JSON.parse(ok(await run([bin, 'schema', 'result', '--json']), 'result schema'));
	JSON.parse(ok(await run([bin, 'schema', 'capture', '--json']), 'capture schema'));
	JSON.parse(ok(await run([bin, 'schema', 'capture-ack', '--json']), 'capture acknowledgement schema'));
	JSON.parse(ok(await run([bin, 'schema', 'setup', '--json']), 'setup schema'));
	SetupResultSchema.parse(JSON.parse(ok(await run([alias, 'setup', '--dry-run', '--json']), 'setup dry run')));

	const html = join(dir, 'fixture.html');
	await Bun.write(html, [
		'<!doctype html><html><head><title>Package Fixture</title></head><body>',
		'<main><article><h1>Package Fixture</h1>',
		'<p>Aria Clip extracts durable Markdown from a deterministic local HTML fixture without network access.</p>',
		'<p>This second paragraph ensures the article contains enough substantive material for extraction.</p>',
		'</article></main></body></html>',
	].join(''));
	const args = ['capture', 'https://example.com/package-fixture', '--html', html, '--json'];
	ResultSchema.parse(JSON.parse(ok(await run([bin, ...args]), 'Bun capture')));
	ResultSchema.parse(JSON.parse(ok(await run([alias, ...args]), 'clip alias capture')));
	ResultSchema.parse(JSON.parse(ok(await run(['node', cli, ...args]), 'Node 24 capture')));
	const home = join(dir, 'aria');
	const saved = ResultSchema.parse(JSON.parse(ok(await run(
		[bin, ...args, '--save'],
		dir,
		{ ...process.env, ARIA_HOME: home },
	), 'template path save')));
	const path = join(home, 'vault', 'Clips', 'package-fixture.md');
	if (saved.delivery.path !== path) {
		throw new Error(`Bare --save ignored the template path: ${saved.delivery.path ?? 'no path'}`);
	}
	await stat(path);
	const node = ok(await run(['node', '--version']), 'Node version').trim();
	const major = z.coerce.number().int().parse(node.match(/^v(\d+)/)?.[1]);
	if (major < 24) throw new Error(`Node compatibility requires Node 24 or later; found ${node}.`);

	console.log(`Package smoke test passed with Bun ${Bun.version} and Node ${node}.`);
} finally {
	await rm(dir, { force: true, recursive: true });
}

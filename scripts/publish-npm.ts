import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const root = resolve(import.meta.dir, '..');
const pkg = z.strictObject({
	name: z.string().regex(/^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/),
	publishConfig: z.strictObject({
		access: z.literal('public'),
		registry: z.literal('https://registry.npmjs.org/'),
	}),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).passthrough().parse(await Bun.file(join(root, 'package.json')).json());
const org = pkg.name.slice(1).split('/')[0];
if (!org) throw new Error(`Package name has no npm organization: ${pkg.name}`);

async function run(command: string, args: string[]): Promise<void> {
	const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
	const code = await new Promise<number>((resolveCode, reject) => {
		child.once('error', reject);
		child.once('close', value => resolveCode(value ?? 1));
	});
	if (code !== 0) throw new Error(`${command} exited with code ${code}.`);
}

async function read(command: string, args: string[]): Promise<string> {
	const child = spawn(command, args, { cwd: root, stdio: ['inherit', 'pipe', 'inherit'] });
	let stdout = '';
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', (chunk: string) => { stdout += chunk; });
	const code = await new Promise<number>((resolveCode, reject) => {
		child.once('error', reject);
		child.once('close', value => resolveCode(value ?? 1));
	});
	if (code !== 0) throw new Error(`${command} exited with code ${code}.`);
	return stdout.trim();
}

const registry = pkg.publishConfig.registry;
const user = await read('npm', ['whoami', '--registry', registry]);
await run('npm', ['org', 'ls', org, user, '--registry', registry]);
await run('bun', ['run', 'test:package']);
const file = `${pkg.name.slice(1).replace('/', '-')}-${pkg.version}.tgz`;
const archive = join(root, 'builds', 'npm', file);
console.log(`Publishing ${pkg.name}@${pkg.version} as ${user} under @${org}.`);
await run('npm', ['publish', archive, '--access', 'public', '--registry', registry, ...process.argv.slice(2)]);

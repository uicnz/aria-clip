import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const root = resolve(import.meta.dir, '..');
const pkg = z.strictObject({
	name: z.literal('aria-clip'),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).passthrough().parse(await Bun.file(join(root, 'package.json')).json());

async function run(command: string, args: string[]): Promise<void> {
	const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
	const code = await new Promise<number>((resolveCode, reject) => {
		child.once('error', reject);
		child.once('close', value => resolveCode(value ?? 1));
	});
	if (code !== 0) throw new Error(`${command} exited with code ${code}.`);
}

await run('bun', ['run', 'test:package']);
const archive = join(root, 'builds', 'npm', `${pkg.name}-${pkg.version}.tgz`);
await run('npm', ['publish', archive, '--access', 'public', ...process.argv.slice(2)]);

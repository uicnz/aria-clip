import * as esbuild from 'esbuild';
import { chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

const defuddleDir = join(root, 'node_modules/defuddle/dist');

const output = join(root, 'dist/cli.cjs');

await esbuild.build({
	entryPoints: [join(root, 'src/cli/index.ts')],
	bundle: true,
	platform: 'node',
	target: 'node24',
	format: 'cjs',
	outfile: output,
	external: [
		'linkedom',
	],
	define: {
		'DEBUG_MODE': 'false',
	},
	alias: {
		'webextension-polyfill': join(root, 'src/platform/node/browser-stubs.ts'),
		'defuddle/full': join(defuddleDir, 'index.full.js'),
		'defuddle': join(defuddleDir, 'index.js'),
	},
	logLevel: 'info',
});

await chmod(output, 0o755);

console.log('CLI built successfully → dist/cli.cjs');

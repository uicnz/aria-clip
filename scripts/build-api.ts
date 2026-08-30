import * as esbuild from 'esbuild';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

await esbuild.build({
	entryPoints: [join(root, 'src/api/index.ts')],
	bundle: true,
	platform: 'neutral',
	format: 'esm',
	outfile: join(root, 'dist/api.mjs'),
	external: [
		'defuddle',
		'defuddle/full',
		'dayjs',
	],
	define: {
		'DEBUG_MODE': 'false',
	},
	alias: {
		'webextension-polyfill': join(root, 'src/platform/node/browser-stubs.ts'),
	},
	logLevel: 'info',
});

console.log('API built successfully → dist/api.mjs');

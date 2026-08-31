import { chmod, copyFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const PackageSchema = z.strictObject({
	name: z.string(),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	description: z.string(),
	keywords: z.array(z.string()),
	author: z.string(),
	homepage: z.url(),
	repository: z.strictObject({ type: z.literal('git'), url: z.string().min(1) }),
	bugs: z.strictObject({ url: z.url() }),
	publishConfig: z.strictObject({ access: z.literal('public') }),
	dependencies: z.record(z.string(), z.string()),
	engines: z.strictObject({ bun: z.string(), node: z.string() }),
}).passthrough();

const root = resolve(import.meta.dir, '..');
const stage = join(root, 'dist', 'npm');
const output = join(root, 'builds', 'npm');
const source = PackageSchema.parse(await Bun.file(join(root, 'package.json')).json());
const runtime = ['dayjs', 'defuddle', 'linkedom'] as const;
const dependencies = Object.fromEntries(runtime.map(name => [name, source.dependencies[name]]));

if (Object.values(dependencies).some(version => version === undefined)) {
	throw new Error('CLI package runtime dependencies are missing from package.json.');
}

const pkg = {
	name: source.name,
	version: source.version,
	description: source.description,
	keywords: source.keywords,
	author: source.author,
	homepage: source.homepage,
	repository: source.repository,
	bugs: source.bugs,
	publishConfig: source.publishConfig,
	type: 'module',
	bin: { 'aria-clip': './cli.cjs', clip: './cli.cjs' },
	exports: {
		'.': './api.mjs',
		'./api': './api.mjs',
		'./package.json': './package.json',
	},
	engines: source.engines,
	dependencies,
};

await rm(stage, { force: true, recursive: true });
await mkdir(stage, { recursive: true });
await mkdir(output, { recursive: true });
await Promise.all([
	copyFile(join(root, 'dist', 'cli.cjs'), join(stage, 'cli.cjs')),
	copyFile(join(root, 'dist', 'api.mjs'), join(stage, 'api.mjs')),
	copyFile(join(root, 'README.md'), join(stage, 'README.md')),
]);
await Bun.write(join(stage, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
await chmod(join(stage, 'cli.cjs'), 0o755);

const file = `aria-clip-${source.version}.tgz`;
await rm(join(output, file), { force: true });
const proc = Bun.spawn([
	'npm', 'pack',
	'--pack-destination', output,
	'--ignore-scripts',
	'--silent',
], { cwd: stage, stderr: 'inherit', stdout: 'inherit' });
const code = await proc.exited;
if (code !== 0) throw new Error(`npm pack failed with exit code ${code}.`);

console.log(join(output, file));

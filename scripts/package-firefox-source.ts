import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');

function isReviewSource(path: string): boolean {
	if (!path || /^(?:builds|dist|node_modules)(?:\/|$)/.test(path)) return false;
	if (/(?:^|\/)\.DS_Store$/.test(path)) return false;
	if (/(?:^|\/)xcuserdata(?:\/|$)/.test(path)) return false;
	if (/(?:^|\/)\.env(?:\..*)?$/.test(path) && !path.endsWith('.env.example')) return false;
	if (/\.(?:key|p12|pfx|pem)$/i.test(path)) return false;
	return existsSync(join(ROOT, path));
}

async function trackedAndUntrackedFiles(): Promise<string[]> {
	const process = Bun.spawn(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
		cwd: ROOT,
		stderr: 'pipe',
		stdout: 'pipe',
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(process.stdout).arrayBuffer(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (exitCode !== 0) throw new Error(`Unable to enumerate review source: ${stderr.trim()}`);
	return new TextDecoder().decode(stdout).split('\0').filter(isReviewSource);
}

async function run(command: string[]): Promise<void> {
	const process = Bun.spawn(command, { cwd: ROOT, stderr: 'inherit', stdout: 'inherit' });
	const exitCode = await process.exited;
	if (exitCode !== 0) throw new Error(`${command[0]} failed with exit code ${exitCode}`);
}

async function verifyArchive(path: string): Promise<void> {
	const process = Bun.spawn(['unzip', '-Z1', path], { cwd: ROOT, stderr: 'pipe', stdout: 'pipe' });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (exitCode !== 0) throw new Error(`Unable to inspect review source: ${stderr.trim()}`);
	const entries = stdout.split('\n').filter(Boolean);
	for (const required of ['AMO_BUILD.md', 'bun.lock', 'package.json', 'webpack.config.cjs']) {
		if (!entries.some(entry => entry.endsWith(`/${required}`))) {
			throw new Error(`Firefox review source is missing ${required}`);
		}
	}
	if (!entries.some(entry => entry.includes('/src/') && entry.endsWith('.ts'))) {
		throw new Error('Firefox review source does not contain TypeScript source files');
	}
}

async function main(): Promise<void> {
	const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version?: unknown };
	if (typeof packageJson.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
		throw new Error(`package.json version must use numeric X.Y.Z format: ${String(packageJson.version)}`);
	}

	const reviewRoot = join(ROOT, 'builds', 'review');
	const outputPath = join(reviewRoot, `aria-clip-${packageJson.version}-firefox-source.zip`);
	const temporaryRoot = mkdtempSync(join(tmpdir(), 'aria-clip-firefox-source-'));
	const sourceRoot = join(temporaryRoot, `aria-clip-${packageJson.version}-source`);

	try {
		for (const path of await trackedAndUntrackedFiles()) {
			const source = join(ROOT, path);
			const destination = join(sourceRoot, path);
			mkdirSync(dirname(destination), { recursive: true });
			const stats = lstatSync(source);
			if (stats.isSymbolicLink()) {
				symlinkSync(readlinkSync(source), destination);
			} else if (stats.isFile()) {
				copyFileSync(source, destination);
			}
		}

		mkdirSync(reviewRoot, { recursive: true });
		if (existsSync(outputPath)) rmSync(outputPath);
		await run([
			'ditto',
			'-c',
			'-k',
			'--norsrc',
			'--noextattr',
			'--noqtn',
			'--noacl',
			'--keepParent',
			sourceRoot,
			outputPath,
		]);
		await verifyArchive(outputPath);
		console.log(outputPath);
	} finally {
		rmSync(temporaryRoot, { force: true, recursive: true });
	}
}

if (import.meta.main) {
	main().catch(error => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}

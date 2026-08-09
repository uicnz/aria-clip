#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REQUIRED_BUN_VERSION = '1.3.14';
const PRODUCT_NAME = 'Aria Clip';
const PRODUCT_SLUG = 'aria-clip';
const PRODUCT_CAMEL = 'ariaClip';
const PRODUCT_PASCAL = 'AriaClip';
const PRODUCT_UPPER = 'ARIA_CLIP';
const BRAND_NAME = 'Aria';
const BRAND_SLUG = 'aria';
const TOOL_NAME = 'Clip';
const TOOL_SLUG = 'clip';

// Build migration-only terms at runtime so a post-migration text audit can be exact.
const previousBrand = ['Obsi', 'dian'].join('');
const previousBrandLower = previousBrand.toLowerCase();
const previousBrandUpper = previousBrand.toUpperCase();
const previousTool = ['Clip', 'per'].join('');
const previousToolLower = previousTool.toLowerCase();
const previousToolUpper = previousTool.toUpperCase();
const previousPackageManager = ['n', 'pm'].join('');
const previousInstallCommand = `${previousPackageManager} install`;
const previousLockFile = ['package', 'lock.json'].join('-');

const generatedDirectories = [
	'builds',
	'dev',
	'dev_firefox',
	'dev_safari',
	'dist',
	'dist_firefox',
	'dist_safari',
];

const ignoredDirectories = new Set([
	'.git',
	'node_modules',
	...generatedDirectories,
]);

const sourceIcon = join(ROOT, 'assets', 'icon.svg');

type Replacement = readonly [from: string, to: string];

function literal(from: string, to: string): Replacement {
	return [from, to] as const;
}

const previousProduct = `${previousBrand} Web ${previousTool}`;
const previousProductHyphenated = `${previousBrand} Web-${previousTool}`;
const previousProductWithoutWeb = `${previousBrand} ${previousTool}`;
const previousSlug = `${previousBrandLower}-${previousToolLower}`;
const previousWebSlug = `${previousBrandLower}-web-${previousToolLower}`;
const previousReverseWebSlug = `web-${previousToolLower}-${previousBrandLower}`;

const storeFallback = 'https://github.com/uicnz/aria-clip/releases';
// Replace the most specific legacy product forms first, then enforce the
// primary brand and tool-name invariants everywhere.
const replacements: Replacement[] = [
	literal(
		`md.${previousBrandLower}.${previousBrand}-Web-${previousTool}.Extension`,
		'nz.uic.aria.clip.extension',
	),
	literal(`md.${previousBrandLower}.${previousBrand}-Web-${previousTool}`, 'nz.uic.aria.clip'),
	literal('DEVELOPMENT_TEAM = 6JSW4SJWN9;', 'DEVELOPMENT_TEAM = N68C9LUA5B;'),
	literal(`${previousToolLower}@${previousBrandLower}.md`, 'clip@aria.bot'),
	literal(
		`https://raw.githubusercontent.com/${previousBrandLower}md/${previousSlug}/refs/heads/main/providers.json`,
		'https://raw.githubusercontent.com/uicnz/aria-clip/refs/heads/main/providers.json',
	),
	literal(`https://github.com/${previousBrandLower}md/${previousSlug}`, 'https://github.com/uicnz/aria-clip'),
	literal(`https://github.com/kepano/${previousToolLower}-templates`, 'https://github.com/uicnz/aria-clip'),
	literal(
		`https://chromewebstore.google.com/detail/${previousWebSlug}/cnjifjpddelmedmihgijeibhnjfabmlf`,
		storeFallback,
	),
	literal(
		`https://addons.mozilla.org/en-US/firefox/addon/${previousReverseWebSlug}/`,
		storeFallback,
	),
	literal(
		`https://apps.apple.com/us/app/${previousWebSlug}/id6720708363`,
		storeFallback,
	),
	literal(
		`https://microsoftedge.microsoft.com/addons/detail/${previousWebSlug}/eigdjhmgnaaeaonimdklocfekkaanfme`,
		storeFallback,
	),
	literal(
		'https://discord.com/channels/686053708261228577/1285652864089198672',
		'https://github.com/uicnz/aria-clip/issues',
	),
	literal(`https://help.${previousBrandLower}.md/${previousBrand}/Early+access+versions`, 'https://docs.aria.bot'),
	literal(`https://help.${previousBrandLower}.md/web-${previousToolLower}`, 'https://docs.aria.bot'),
	literal(`https://${previousBrandLower}.md`, 'https://aria.bot'),
	literal(`${previousBrandLower}md`, 'uicnz'),
	literal(previousProduct, PRODUCT_NAME),
	literal(previousProductHyphenated, PRODUCT_NAME),
	literal(previousProductWithoutWeb, PRODUCT_NAME),
	literal(previousProduct.toUpperCase(), PRODUCT_NAME.toUpperCase()),
	literal(`${previousBrandLower} web ${previousToolLower}`, PRODUCT_NAME),
	literal(previousWebSlug, PRODUCT_SLUG),
	literal(previousReverseWebSlug, PRODUCT_SLUG),
	literal(previousSlug, PRODUCT_SLUG),
	literal(`${previousBrandLower}Web${previousTool}`, PRODUCT_CAMEL),
	literal(`${previousBrand}Web${previousTool}`, PRODUCT_PASCAL),
	literal(`${previousBrandLower}${previousTool}`, PRODUCT_CAMEL),
	literal(`${previousBrand}${previousTool}`, PRODUCT_PASCAL),
	literal(`${previousBrandUpper}_${previousToolUpper}`, PRODUCT_UPPER),
	literal(`Web ${previousTool}`, TOOL_NAME),
	literal(`Web-${previousTool}`, TOOL_NAME),
	literal(`web ${previousToolLower}`, TOOL_SLUG),
	literal(`web-${previousToolLower}`, TOOL_SLUG),
	literal(previousBrandUpper, BRAND_NAME.toUpperCase()),
	literal(previousBrand, BRAND_NAME),
	literal(previousBrandLower, BRAND_SLUG),
	literal(previousToolUpper, TOOL_NAME.toUpperCase()),
	literal(previousTool, TOOL_NAME),
	literal(previousToolLower, TOOL_SLUG),
];

function replaceAllLiteral(value: string, from: string, to: string): string {
	return from === to ? value : value.split(from).join(to);
}

function rebrand(value: string): string {
	return replacements.reduce(
		(result, [from, to]) => replaceAllLiteral(result, from, to),
		value,
	);
}

function digest(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function listFiles(directory: string): string[] {
	const result: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) result.push(...listFiles(path));
		else if (entry.isFile()) result.push(path);
	}
	return result;
}

function listPaths(directory: string): string[] {
	const result: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) result.push(...listPaths(path));
		result.push(path);
	}
	return result;
}

function decodeText(path: string): string | undefined {
	const bytes = readFileSync(path);
	if (bytes.includes(0)) return undefined;
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return undefined;
	}
}

function removeGeneratedOutput(): void {
	for (const name of generatedDirectories) {
		const path = join(ROOT, name);
		if (existsSync(path)) rmSync(path, { recursive: true, force: true });
	}
}

function collectBrandMessageKeys(): string[] {
	const englishPath = join(ROOT, 'src', '_locales', 'en', 'messages.json');
	const messages = JSON.parse(readFileSync(englishPath, 'utf8')) as Record<string, unknown>;
	const terms = [previousBrand, previousBrandLower, previousTool, previousToolLower];
	return Object.entries(messages)
		.filter(([, value]) => terms.some((term) => JSON.stringify(value).includes(term)))
		.map(([key]) => rebrand(key));
}

function rewriteTextFiles(): number {
	let changed = 0;
	for (const path of listFiles(ROOT)) {
		if (path === sourceIcon || path === SCRIPT_PATH) continue;
		const content = decodeText(path);
		if (content === undefined) continue;
		let next = rebrand(content);
		if (path.endsWith('.html')) {
			next = next.replace(
				/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="logo"[\s\S]*?<\/svg>/g,
				'<img src="icons/icon128.png" class="logo" alt="">',
			);
		}
		if (next === content) continue;
		writeFileSync(path, next);
		changed += 1;
	}
	return changed;
}

function renamePaths(): number {
	let changed = 0;
	const paths = listPaths(ROOT).sort((a, b) => b.split('/').length - a.split('/').length);
	for (const oldPath of paths) {
		if (!existsSync(oldPath)) continue;
		const newName = rebrand(basename(oldPath));
		if (newName === basename(oldPath)) continue;
		const newPath = join(dirname(oldPath), newName);
		if (existsSync(newPath)) {
			throw new Error(`Refusing to overwrite existing path: ${relative(ROOT, newPath)}`);
		}
		renameSync(oldPath, newPath);
		changed += 1;
	}
	return changed;
}

function normalizeLocalizedBrandMessages(keys: string[]): number {
	const localesRoot = join(ROOT, 'src', '_locales');
	const englishPath = join(localesRoot, 'en', 'messages.json');
	const english = JSON.parse(readFileSync(englishPath, 'utf8')) as Record<string, unknown>;
	let changed = 0;

	for (const locale of readdirSync(localesRoot, { withFileTypes: true })) {
		if (!locale.isDirectory() || locale.name === 'en') continue;
		const path = join(localesRoot, locale.name, 'messages.json');
		const messages = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
		let localeChanged = false;
		for (const key of keys) {
			if (!(key in english) || !(key in messages)) continue;
			const source = JSON.stringify(english[key]);
			if (JSON.stringify(messages[key]) === source) continue;
			messages[key] = JSON.parse(source);
			localeChanged = true;
		}
		if (localeChanged) {
			writeFileSync(path, `${JSON.stringify(messages, null, '\t')}\n`);
			changed += 1;
		}
	}

	return changed;
}

function migratePackageToBun(): void {
	const packagePath = join(ROOT, 'package.json');
	const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
		name: string;
		description?: string;
		packageManager?: string;
		engines?: Record<string, string>;
		scripts: Record<string, string>;
		devDependencies: Record<string, string>;
	};

	packageJson.name = PRODUCT_SLUG;
	packageJson.description = 'Browser clip for Aria.';
	packageJson.packageManager = `bun@${REQUIRED_BUN_VERSION}`;
	packageJson.engines = { ...(packageJson.engines ?? {}), bun: `>=${REQUIRED_BUN_VERSION}` };
	packageJson.scripts = {
		...packageJson.scripts,
		'defuddle-dev': 'bun run scripts/set-defuddle-dev.js',
		'defuddle-prod': 'bun run scripts/set-defuddle-prod.js',
		build: 'bun run build:chrome && bun run build:firefox && bun run build:safari',
		'build:cli': 'bun run scripts/build-cli.mjs',
		'build:api': 'bun run scripts/build-api.mjs',
		dev: 'bun run dev:chrome',
		'update-locales': 'bun run scripts/update-locales.ts',
		'check-strings': 'bun run scripts/check-unused-strings.ts',
		'add-locale': 'bun run scripts/add-locale.ts',
		rebrand: 'bun run scripts/rebrand-to-aria-clip.ts',
		prepublishOnly: 'bun run build:cli && bun run build:api',
	};
	packageJson.devDependencies['@types/webextension-polyfill'] = '0.12.1';
	packageJson.devDependencies.sass = '1.78.0';
	packageJson.devDependencies['terser-webpack-plugin'] = '^5.4.0';
	delete packageJson.devDependencies['ts-node'];
	writeFileSync(packagePath, `${JSON.stringify(packageJson, null, '\t')}\n`);

	for (const scriptName of ['set-defuddle-dev.js', 'set-defuddle-prod.js']) {
		const path = join(ROOT, 'scripts', scriptName);
		const content = readFileSync(path, 'utf8');
		const bunContent = replaceAllLiteral(content, previousInstallCommand, 'bun install');
		writeFileSync(path, bunContent.split('\n').map((line) => line.trimEnd()).join('\n'));
	}

	const scriptsReadmePath = join(ROOT, 'scripts', 'readme.md');
	const scriptsReadme = readFileSync(scriptsReadmePath, 'utf8');
	writeFileSync(
		scriptsReadmePath,
		replaceAllLiteral(
			scriptsReadme,
			`Scripts can be run using ${previousPackageManager} in the root of the repo.`,
			'Scripts can be run using Bun in the root of the repo.',
		),
	);

	const gitignorePath = join(ROOT, '.gitignore');
	const gitignore = readFileSync(gitignorePath, 'utf8');
	writeFileSync(
		gitignorePath,
		replaceAllLiteral(gitignore, `# ${previousPackageManager.toUpperCase()}`, '# Bun'),
	);

	const cliBuildPath = join(ROOT, 'scripts', 'build-cli.mjs');
	const cliBuild = readFileSync(cliBuildPath, 'utf8');
	writeFileSync(cliBuildPath, replaceAllLiteral(cliBuild, '#!/usr/bin/env node', '#!/usr/bin/env bun'));

	const tsconfigPath = join(ROOT, 'tsconfig.json');
	const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as {
		compilerOptions: Record<string, unknown>;
	};
	tsconfig.compilerOptions.module = 'es2020';
	writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, '\t')}\n`);

	const vitestConfigPath = join(ROOT, 'vitest.config.ts');
	const vitestModuleConfigPath = join(ROOT, 'vitest.config.mts');
	const activeVitestConfigPath = existsSync(vitestConfigPath) ? vitestConfigPath : vitestModuleConfigPath;
	const vitestConfig = readFileSync(activeVitestConfigPath, 'utf8');
	if (!vitestConfig.includes("process.env.TZ = 'UTC';")) {
		writeFileSync(
			activeVitestConfigPath,
			vitestConfig.replace(
				"import { defineConfig } from 'vitest/config';",
				"import { defineConfig } from 'vitest/config';\n\nprocess.env.TZ = 'UTC';",
			),
		);
	}
	if (activeVitestConfigPath === vitestConfigPath) {
		renameSync(vitestConfigPath, vitestModuleConfigPath);
	}

	const stringCheckPath = join(ROOT, 'scripts', 'check-unused-strings.ts');
	const stringCheck = readFileSync(stringCheckPath, 'utf8');
	writeFileSync(
		stringCheckPath,
		replaceAllLiteral(stringCheck, "path.join(__dirname, '../src/locales')", "path.join(__dirname, '../src/_locales')"),
	);

	const xcodeProjectPath = join(ROOT, 'xcode', 'Aria Clip', 'Aria Clip.xcodeproj', 'project.pbxproj');
	const xcodeProject = readFileSync(xcodeProjectPath, 'utf8');
	writeFileSync(
		xcodeProjectPath,
		replaceAllLiteral(xcodeProject, 'MACOSX_DEPLOYMENT_TARGET = 11.0;', 'MACOSX_DEPLOYMENT_TARGET = 12.0;'),
	);
	const safariHandlerPath = join(ROOT, 'xcode', 'Aria Clip', 'Shared (Extension)', 'SafariWebExtensionHandler.swift');
	const safariHandler = readFileSync(safariHandlerPath, 'utf8');
	if (!safariHandler.includes('_ = profile')) {
		writeFileSync(
			safariHandlerPath,
			safariHandler.replace(
				'            profile = request?.userInfo?["profile"] as? UUID\n        }\n\n        let message: Any?',
				'            profile = request?.userInfo?["profile"] as? UUID\n        }\n        _ = profile\n\n        let message: Any?',
			),
		);
	}
	const youtubeExpectedPath = join(ROOT, 'src', 'utils', 'fixtures', 'expected', 'youtube.md');
	const youtubeExpected = readFileSync(youtubeExpectedPath, 'utf8');
	writeFileSync(
		youtubeExpectedPath,
		replaceAllLiteral(youtubeExpected, '2025-01-15T04:00:00-08:00', '2025-01-15T12:00:00+00:00'),
	);

	const legacyLockPath = join(ROOT, previousLockFile);
	if (existsSync(legacyLockPath)) rmSync(legacyLockPath);
}

function commandExists(command: string): boolean {
	return spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' }).status === 0;
}

function run(command: string, args: string[]): void {
	const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
	}
}

function renderPng(output: string, size: number): void {
	mkdirSync(dirname(output), { recursive: true });
	if (commandExists('rsvg-convert')) {
		run('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', output, sourceIcon]);
		return;
	}
	if (commandExists('magick')) {
		run('magick', ['-background', 'none', sourceIcon, '-resize', `${size}x${size}`, '-strip', output]);
		return;
	}
	if (commandExists('sips')) {
		run('sips', ['-s', 'format', 'png', '-z', String(size), String(size), sourceIcon, '--out', output]);
		return;
	}
	throw new Error('Icon rendering requires rsvg-convert, ImageMagick, or sips.');
}

function findFont(): string | undefined {
	const candidates = [
		'/System/Library/Fonts/SFNS.ttf',
		'/System/Library/Fonts/Supplemental/Arial.ttf',
		'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
	];
	return candidates.find(existsSync);
}

function renderMarketingCard(
	output: string,
	width: number,
	height: number,
	title: string,
	subtitle?: string,
): void {
	if (!commandExists('magick')) {
		throw new Error('Marketing artwork generation requires ImageMagick (`magick`).');
	}
	const font = findFont();
	if (!font) throw new Error('Could not find a usable system font for marketing artwork.');
	const iconSize = Math.round(Math.min(width, height) * 0.22);
	const titleSize = Math.round(Math.min(width, height) * 0.075);
	const subtitleSize = Math.round(titleSize * 0.44);
	const iconOffset = subtitle ? -Math.round(height * 0.16) : -Math.round(height * 0.1);
	const titleOffset = subtitle ? Math.round(height * 0.11) : Math.round(height * 0.2);
	const args = [
		'-size', `${width}x${height}`,
		'canvas:#f5f5f2',
		'(', join(ROOT, 'xcode', 'Aria Clip', 'Shared (App)', 'AppIcon.icon', 'Assets', 'AppIcon.png'), '-resize', `${iconSize}x${iconSize}`, ')',
		'-gravity', 'center',
		'-geometry', `+0${iconOffset >= 0 ? '+' : ''}${iconOffset}`,
		'-composite',
		'-font', font,
		'-fill', '#111111',
		'-pointsize', String(titleSize),
		'-gravity', 'center',
		'-annotate', `+0+${titleOffset}`, title,
	];
	if (subtitle) {
		args.push(
			'-fill', '#555555',
			'-pointsize', String(subtitleSize),
			'-annotate', `+0+${titleOffset + Math.round(titleSize * 1.25)}`, subtitle,
		);
	}
	args.push('-strip', '+set', 'date:create', '+set', 'date:modify', output);
	run('magick', args);
}

function refreshBrandArtwork(): void {
	const iconTargets: Array<[string, number]> = [
		['src/icons/icon16.png', 16],
		['src/icons/icon48.png', 48],
		['src/icons/icon128.png', 128],
		['assets/chrome/icon128-chrome-store.png', 128],
		['assets/edge/icon-300.png', 300],
		['xcode/Aria Clip/Shared (App)/Resources/Icon.png', 384],
		['xcode/Aria Clip/Shared (App)/Assets.xcassets/LargeIcon.imageset/icon128.png', 128],
		['xcode/Aria Clip/Shared (App)/Assets.xcassets/LargeIcon.imageset/icon128@2x.png', 256],
		['xcode/Aria Clip/Shared (App)/Assets.xcassets/LargeIcon.imageset/icon128@3x.png', 384],
		['xcode/Aria Clip/Shared (App)/AppIcon.icon/Assets/AppIcon.png', 1024],
		['xcode/Aria Clip/Shared (App)/AppIcon.icon/Assets/AppIcon-Dark.png', 1024],
		['xcode/Aria Clip/Shared (App)/AppIcon.icon/Assets/AppIcon-Tint.png', 1024],
	];
	for (const [path, size] of iconTargets) renderPng(join(ROOT, path), size);

	renderMarketingCard(join(ROOT, 'assets/edge/440x280.png'), 440, 280, PRODUCT_NAME);
	renderMarketingCard(
		join(ROOT, 'assets/safari/screen-01.png'),
		1440,
		900,
		PRODUCT_NAME,
		'Capture the web into Aria.',
	);
	renderMarketingCard(
		join(ROOT, 'assets/safari/screen-02.png'),
		1440,
		900,
		'Clip pages. Keep what matters.',
		'Templates, highlights, reader mode, and AI interpretation.',
	);
	renderMarketingCard(
		join(ROOT, 'assets/safari/ipad.png'),
		2752,
		2064,
		PRODUCT_NAME,
		'Capture the web into Aria.',
	);
}

function installWithBun(): void {
	if (process.versions.bun !== REQUIRED_BUN_VERSION) {
		throw new Error(
			`Expected Bun ${REQUIRED_BUN_VERSION}, received ${process.versions.bun ?? 'a non-Bun runtime'}.`,
		);
	}
	run('bun', ['install', '--save-text-lockfile']);
}

function audit(): void {
	const stale: string[] = [];
	const forbidden = [previousBrand, previousBrandLower, previousTool, previousToolLower];
	for (const path of listPaths(ROOT)) {
		const relativePath = relative(ROOT, path);
		if (forbidden.some((term) => relativePath.includes(term))) stale.push(`path: ${relativePath}`);
		if (!lstatSync(path).isFile() || path === sourceIcon || path === SCRIPT_PATH) continue;
		const content = decodeText(path);
		if (content === undefined) continue;
		for (const term of forbidden) {
			if (content.includes(term)) stale.push(`text: ${relativePath} contains ${JSON.stringify(term)}`);
		}
	}
	if (stale.length > 0) {
		throw new Error(`Rebrand audit failed:\n${stale.slice(0, 100).join('\n')}`);
	}
}

function main(): void {
	if (!existsSync(sourceIcon)) throw new Error('Missing required branding source: assets/icon.svg');
	const iconDigestBefore = digest(sourceIcon);
	removeGeneratedOutput();
	const brandMessageKeys = collectBrandMessageKeys();
	const rewrittenFiles = rewriteTextFiles();
	const renamedPaths = renamePaths();
	const normalizedLocales = normalizeLocalizedBrandMessages(brandMessageKeys);
	migratePackageToBun();
	refreshBrandArtwork();
	installWithBun();
	audit();
	const iconDigestAfter = digest(sourceIcon);
	if (iconDigestAfter !== iconDigestBefore) {
		throw new Error('assets/icon.svg changed during migration; refusing to continue.');
	}
	console.log(
		`Rebranded ${rewrittenFiles} text files, renamed ${renamedPaths} paths, and normalized ${normalizedLocales} locale files.`,
	);
	console.log(`Preserved assets/icon.svg (${iconDigestAfter}).`);
}

main();

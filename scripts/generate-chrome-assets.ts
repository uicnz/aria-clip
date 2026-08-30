import { copyFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type AssetSpec = {
	file: string;
	height: number;
	layout: 'horizontal' | 'stacked';
	logoOffsetY: number;
	logoSize: number;
	taglineOffsetY: number;
	taglineSize: number;
	titleOffsetY: number;
	titleSize: number;
	width: number;
};

const ROOT = resolve(import.meta.dir, '..');
const ASSET_DIR = join(ROOT, 'assets', 'chrome');
const ICON = join(ROOT, 'assets', 'icon.svg');
const STORE_ICON = join(ASSET_DIR, 'icon128-chrome-store.png');
const LOCALIZED_SCREENSHOT = join(ASSET_DIR, 'localized-screenshots-01.png');
const GLOBAL_SCREENSHOT = join(ASSET_DIR, 'global-screenshots-01.png');
const ROBOTO_300 = join(ASSET_DIR, 'fonts', 'Roboto-Light.ttf');
const ROBOTO_900 = join(ASSET_DIR, 'fonts', 'Roboto-Black.ttf');
const TITLE = 'Aria Clip';
const TAGLINE = 'Capture the web as Markdown';

const assets: AssetSpec[] = [
	{
		file: 'promo-small-440x280.png',
		width: 440,
		height: 280,
		layout: 'stacked',
		logoSize: 92,
		logoOffsetY: -55,
		titleSize: 34,
		titleOffsetY: 48,
		taglineSize: 15,
		taglineOffsetY: 91,
	},
	{
		file: 'promo-marquee-1400x560.png',
		width: 1400,
		height: 560,
		layout: 'horizontal',
		logoSize: 340,
		logoOffsetY: 0,
		titleSize: 108,
		titleOffsetY: -56,
		taglineSize: 38,
		taglineOffsetY: 82,
	},
];

function geometry(y: number): string {
	return `+0${y >= 0 ? '+' : ''}${y}`;
}

async function run(command: string[]): Promise<string> {
	const process = Bun.spawn(command, {
		cwd: ROOT,
		stderr: 'pipe',
		stdout: 'pipe',
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(`${command[0]} failed with exit code ${exitCode}: ${(stderr || stdout).trim()}`);
	}
	return stdout.trim();
}

async function dimensions(path: string): Promise<{ height: number; width: number }> {
	const output = await run(['magick', 'identify', '-format', '%w %h', path]);
	const [width, height] = output.split(/\s+/).map(Number);
	return { width, height };
}

async function verifyOpaquePng(
	path: string,
	spec: Pick<AssetSpec, 'file' | 'height' | 'width'>,
): Promise<void> {
	const output = await run(['magick', 'identify', '-format', '%w %h %[opaque] %[channels]', path]);
	const [width, height, opaque, ...channels] = output.split(/\s+/);
	if (Number(width) !== spec.width || Number(height) !== spec.height) {
		throw new Error(`${spec.file} has dimensions ${width}x${height}; expected ${spec.width}x${spec.height}`);
	}
	if (opaque.toLowerCase() !== 'true' || channels.join(' ').toLowerCase().includes('a')) {
		throw new Error(`${spec.file} must be an opaque 24-bit PNG without an alpha channel`);
	}
}

async function prepareScreenshots(temporaryRoot: string): Promise<void> {
	const normalized = join(temporaryRoot, 'localized-screenshots-01.png');
	const current = await dimensions(LOCALIZED_SCREENSHOT);
	const targetRatio = 1280 / 800;
	const currentRatio = current.width / current.height;
	const cropWidth = currentRatio > targetRatio ? Math.round(current.height * targetRatio) : current.width;
	const cropHeight = currentRatio < targetRatio ? Math.round(current.width / targetRatio) : current.height;

	await run([
		'magick',
		LOCALIZED_SCREENSHOT,
		'-gravity', currentRatio > targetRatio ? 'east' : 'center',
		'-crop', `${cropWidth}x${cropHeight}+0+0`,
		'+repage',
		'-resize', '1280x800',
		'-strip',
		'-colorspace', 'sRGB',
		'-depth', '8',
		'-alpha', 'off',
		`PNG24:${normalized}`,
	]);

	copyFileSync(normalized, LOCALIZED_SCREENSHOT);
	copyFileSync(normalized, GLOBAL_SCREENSHOT);
	for (const [file, path] of [
		['localized-screenshots-01.png', LOCALIZED_SCREENSHOT],
		['global-screenshots-01.png', GLOBAL_SCREENSHOT],
	] as const) {
		await verifyOpaquePng(path, { file, width: 1280, height: 800 });
		console.log(`${file} (1280x800)`);
	}
}

async function render(spec: AssetSpec, temporaryRoot: string): Promise<void> {
	const rasterLogo = join(temporaryRoot, `${spec.width}x${spec.height}-logo.png`);
	const output = join(ASSET_DIR, spec.file);
	const horizontal = spec.layout === 'horizontal';
	const logoGeometry = horizontal ? '+210+0' : geometry(spec.logoOffsetY);
	const textGravity = horizontal ? 'west' : 'center';
	const titleGeometry = horizontal ? `+640${spec.titleOffsetY}` : geometry(spec.titleOffsetY);
	const taglineGeometry = horizontal ? `+640+${spec.taglineOffsetY}` : geometry(spec.taglineOffsetY);

	await run([
		'rsvg-convert',
		'--width', String(spec.logoSize),
		'--height', String(spec.logoSize),
		'--keep-aspect-ratio',
		'--output', rasterLogo,
		ICON,
	]);

	await run([
		'magick',
		'-size', `${spec.width}x${spec.height}`,
		'xc:#000000',
		rasterLogo,
		'-gravity', horizontal ? 'west' : 'center',
		'-geometry', logoGeometry,
		'-composite',
		'-font', ROBOTO_900,
		'-pointsize', String(spec.titleSize),
		'-fill', '#ffffff',
		'-gravity', textGravity,
		'-annotate', titleGeometry, TITLE,
		'-font', ROBOTO_300,
		'-pointsize', String(spec.taglineSize),
		'-fill', '#a3a3a3',
		'-annotate', taglineGeometry, TAGLINE,
		'-strip',
		'-colorspace', 'sRGB',
		'-depth', '8',
		'-alpha', 'off',
		`PNG24:${output}`,
	]);

	await verifyOpaquePng(output, spec);
	console.log(`${spec.file} (${spec.width}x${spec.height})`);
}

async function main(): Promise<void> {
	if (!Bun.which('magick')) {
		throw new Error('ImageMagick is required. Install it and ensure `magick` is on PATH.');
	}
	if (!Bun.which('rsvg-convert')) {
		throw new Error('librsvg is required. Install it and ensure `rsvg-convert` is on PATH.');
	}
	for (const required of [ICON, STORE_ICON, LOCALIZED_SCREENSHOT, ROBOTO_300, ROBOTO_900]) {
		if (!existsSync(required)) throw new Error(`Required asset is missing: ${required}`);
	}

	const storeIconDimensions = await dimensions(STORE_ICON);
	if (storeIconDimensions.width !== 128 || storeIconDimensions.height !== 128) {
		throw new Error('The untouched Chrome store icon must remain exactly 128x128 pixels');
	}

	mkdirSync(ASSET_DIR, { recursive: true });
	const temporaryRoot = mkdtempSync(join(tmpdir(), 'aria-clip-chrome-assets-'));
	try {
		console.log('Preserving icon128-chrome-store.png unchanged (128x128)');
		await prepareScreenshots(temporaryRoot);
		for (const spec of assets) await render(spec, temporaryRoot);
	} finally {
		rmSync(temporaryRoot, { force: true, recursive: true });
	}
}

main().catch(error => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

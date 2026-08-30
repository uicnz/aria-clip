import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { homedir, platform, tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { loadEnv } from '../src/platform/node/env.js';

type Options = {
	dryRun: boolean;
	skipChecks: boolean;
	skipNotarize: boolean;
};

type CommandResult = {
	exitCode: number;
	stderr: string;
	stdout: string;
};

const ROOT = resolve(import.meta.dir, '..');
const BUILDS = join(ROOT, 'builds');
const PROJECT = join(ROOT, 'xcode', 'Aria Clip', 'Aria Clip.xcodeproj');
const SCHEME = 'Aria Clip (macOS)';
const DEFAULT_TEAM_ID = 'N68C9LUA5B';
const DEFAULT_NOTARY_PROFILE = 'aria-notarytool';

function usage(): string {
	return [
		'Build Chrome and Firefox store ZIPs plus a signed/notarized Safari DMG.',
		'',
		'Usage: bun run release [options]',
		'',
		'Options:',
		'  --dry-run         Print the release commands without running them',
		'  --skip-checks     Skip type checking and tests',
		'  --skip-notarize   Build and sign the Safari DMG without notarizing it',
		'  --help            Show this help',
		'',
		'Environment:',
		'  ARIA_NOTARY_KEYCHAIN             Optional Keychain path used by notarytool',
		'  ARIA_NOTARY_KEYCHAIN_PASSWORD    Optional password used to unlock that Keychain',
		'  ARIA_NOTARY_BOOTSTRAP_APPLE_ID   Apple ID used to restore a missing profile',
		'  ARIA_NOTARY_BOOTSTRAP_TEAM_ID    Apple team used to restore a missing profile',
		'  ARIA_NOTARY_BOOTSTRAP_PASSWORD   App-specific password used to restore a missing profile',
		'  ARIA_NOTARY_BOOTSTRAP_API_KEY_PATH  App Store Connect private key alternative',
		'  ARIA_NOTARY_BOOTSTRAP_API_KEY_ID    App Store Connect key ID',
		'  ARIA_NOTARY_BOOTSTRAP_API_ISSUER    App Store Connect issuer ID',
	].join('\n');
}

export function parseOptions(args: string[]): Options {
	const options: Options = {
		dryRun: false,
		skipChecks: false,
		skipNotarize: false,
	};

	for (const arg of args) {
		switch (arg) {
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--skip-checks':
				options.skipChecks = true;
				break;
			case '--skip-notarize':
				options.skipNotarize = true;
				break;
			case '--help':
				console.log(usage());
				process.exit(0);
			default:
				throw new Error(`Unknown release option: ${arg}\n\n${usage()}`);
		}
	}

	return options;
}

function quote(value: string): string {
	return /^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

function printCommand(command: string[]): void {
	console.log(`$ ${command.map(quote).join(' ')}`);
}

async function run(command: string[], options: { cwd?: string; dryRun?: boolean } = {}): Promise<void> {
	printCommand(command);
	if (options.dryRun) return;

	const proc = Bun.spawn(command, {
		cwd: options.cwd ?? ROOT,
		env: process.env,
		stderr: 'inherit',
		stdout: 'inherit',
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`${command[0]} failed with exit code ${exitCode}`);
	}
}

async function capture(command: string[]): Promise<CommandResult> {
	const proc = Bun.spawn(command, {
		cwd: ROOT,
		env: process.env,
		stderr: 'pipe',
		stdout: 'pipe',
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

async function readVersion(): Promise<string> {
	const packageJson = (await Bun.file(join(ROOT, 'package.json')).json()) as { version?: unknown };
	if (typeof packageJson.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
		throw new Error(`package.json version must use numeric X.Y.Z format: ${String(packageJson.version)}`);
	}
	return packageJson.version;
}

function requireTools(tools: string[]): void {
	for (const tool of tools) {
		if (!Bun.which(tool)) throw new Error(`Required release tool is not on PATH: ${tool}`);
	}
}

async function resolveSignIdentity(teamId: string): Promise<string> {
	const result = await capture(['security', 'find-identity', '-v', '-p', 'codesigning']);
	if (result.exitCode !== 0) {
		throw new Error(`Unable to inspect signing identities: ${result.stderr.trim()}`);
	}

	const identities = [...result.stdout.matchAll(/"([^"]*Developer ID Application[^"]*)"/g)].map(match => match[1]);
	const identity = identities.find(candidate => candidate?.includes(`(${teamId})`));
	if (!identity) {
		throw new Error(
			`No Developer ID Application identity was found for team ${teamId}. ` +
				'Install the uic.nz Developer ID Application certificate in Keychain Access.'
		);
	}
	return identity;
}

function notaryAuthArgs(profile: string): string[] {
	const args = ['--keychain-profile', profile];
	const keychain = notaryKeychain();
	if (keychain) args.push('--keychain', keychain);
	return args;
}

function notaryKeychain(): string | undefined {
	const value = process.env.ARIA_NOTARY_KEYCHAIN?.trim();
	if (!value) return undefined;
	return value === '~' ? homedir() : value.startsWith('~/') ? join(homedir(), value.slice(2)) : value;
}

async function unlockNotaryKeychain(): Promise<void> {
	const keychain = notaryKeychain();
	const password = process.env.ARIA_NOTARY_KEYCHAIN_PASSWORD?.trim();
	if (!keychain || !password) return;
	const result = await capture(['security', 'unlock-keychain', '-p', password, keychain]);
	if (result.exitCode !== 0) {
		throw new Error(`Unable to unlock notary Keychain "${keychain}": ${(result.stderr || result.stdout).trim()}`);
	}
}

function notaryBootstrapArgs(teamId: string): string[] | undefined {
	const keyPath = process.env.ARIA_NOTARY_BOOTSTRAP_API_KEY_PATH?.trim();
	const keyId = process.env.ARIA_NOTARY_BOOTSTRAP_API_KEY_ID?.trim();
	const issuer = process.env.ARIA_NOTARY_BOOTSTRAP_API_ISSUER?.trim();
	const apiSupplied = [keyPath, keyId, issuer].filter(Boolean).length;
	if (apiSupplied > 0) {
		if (!keyPath || !keyId) {
			throw new Error('Notary API bootstrap requires ARIA_NOTARY_BOOTSTRAP_API_KEY_PATH and ARIA_NOTARY_BOOTSTRAP_API_KEY_ID together.');
		}
		const args = ['--key', keyPath, '--key-id', keyId];
		if (issuer) args.push('--issuer', issuer);
		return args;
	}

	const appleId = process.env.ARIA_NOTARY_BOOTSTRAP_APPLE_ID?.trim();
	const bootstrapTeam = process.env.ARIA_NOTARY_BOOTSTRAP_TEAM_ID?.trim();
	const password = process.env.ARIA_NOTARY_BOOTSTRAP_PASSWORD?.trim();
	const appleSupplied = [appleId, bootstrapTeam, password].filter(Boolean).length;
	if (appleSupplied === 0) return undefined;
	if (!appleId || !bootstrapTeam || !password) {
		throw new Error('Notary Apple ID bootstrap requires ARIA_NOTARY_BOOTSTRAP_APPLE_ID, ARIA_NOTARY_BOOTSTRAP_TEAM_ID, and ARIA_NOTARY_BOOTSTRAP_PASSWORD together.');
	}
	if (bootstrapTeam !== teamId) {
		throw new Error(`ARIA_NOTARY_BOOTSTRAP_TEAM_ID is ${bootstrapTeam}; expected the Aria signing team ${teamId}.`);
	}
	return ['--apple-id', appleId, '--team-id', bootstrapTeam, '--password', password];
}

async function preflightNotary(profile: string, teamId: string): Promise<void> {
	await unlockNotaryKeychain();
	let result = await capture(['xcrun', 'notarytool', 'history', ...notaryAuthArgs(profile), '--output-format', 'json']);
	if (result.exitCode === 0) return;

	const bootstrap = notaryBootstrapArgs(teamId);
	if (bootstrap) {
		const command = [
			'xcrun', 'notarytool', 'store-credentials', profile,
			...bootstrap,
		];
		const keychain = notaryKeychain();
		if (keychain) command.push('--keychain', keychain);
		const stored = await capture(command);
		if (stored.exitCode !== 0) {
			throw new Error(`Unable to restore notary profile "${profile}": ${(stored.stderr || stored.stdout).trim()}`);
		}
		result = await capture(['xcrun', 'notarytool', 'history', ...notaryAuthArgs(profile), '--output-format', 'json']);
		if (result.exitCode === 0) return;
	}

	throw new Error(
		`notarytool could not use Keychain profile "${profile}". ` +
		`${(result.stderr || result.stdout).trim()}`
	);
}

async function verifyWebArchive(path: string, version: string): Promise<void> {
	if (!existsSync(path)) throw new Error(`Expected browser artifact was not created: ${path}`);

	const listing = await capture(['unzip', '-Z1', path]);
	if (listing.exitCode !== 0) throw new Error(`Unable to inspect ${basename(path)}: ${listing.stderr.trim()}`);
	const entries = listing.stdout.split('\n').filter(Boolean);
	if (!entries.includes('manifest.json')) throw new Error(`${basename(path)} does not contain a root manifest.json`);

	const debris = entries.filter(entry =>
		/(^|\/)\.DS_Store$/.test(entry) || /\.(?:map|ts|tsx)$/.test(entry)
	);
	if (debris.length > 0) {
		throw new Error(`${basename(path)} contains development-only files:\n${debris.join('\n')}`);
	}

	const manifestResult = await capture(['unzip', '-p', path, 'manifest.json']);
	if (manifestResult.exitCode !== 0) throw new Error(`Unable to read ${basename(path)} manifest`);
	const manifest = JSON.parse(manifestResult.stdout) as { version?: unknown };
	if (manifest.version !== version) {
		throw new Error(`${basename(path)} has version ${String(manifest.version)}; expected ${version}`);
	}
}

function exportOptions(teamId: string): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">',
		'<dict>',
		'\t<key>destination</key>',
		'\t<string>export</string>',
		'\t<key>method</key>',
		'\t<string>developer-id</string>',
		'\t<key>signingStyle</key>',
		'\t<string>automatic</string>',
		'\t<key>stripSwiftSymbols</key>',
		'\t<true/>',
		'\t<key>teamID</key>',
		`\t<string>${teamId}</string>`,
		'</dict>',
		'</plist>',
		'',
	].join('\n');
}

function filesBelow(root: string, relative = ''): string[] {
	const directory = join(root, relative);
	return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
		const path = join(relative, entry.name);
		return entry.isDirectory() ? filesBelow(root, path) : [path];
	});
}

async function verifySafariBundle(appPath: string, teamId: string): Promise<void> {
	const sourceRoot = join(ROOT, 'dist', 'safari');
	const bundleRoot = join(
		appPath,
		'Contents',
		'PlugIns',
		'Aria Clip Extension.appex',
		'Contents',
		'Resources'
	);
	const requiredFiles = filesBelow(sourceRoot).filter(path =>
		!path.startsWith(`_locales${sep}`) && statSync(join(sourceRoot, path)).size > 0
	);
	const missingFiles = requiredFiles.filter(path => !existsSync(join(bundleRoot, path)));
	if (missingFiles.length > 0) {
		throw new Error(
			`The Safari Xcode target omitted generated extension resources:\n${missingFiles.join('\n')}`
		);
	}

	const signature = await capture(['codesign', '-dv', '--verbose=4', appPath]);
	const details = `${signature.stdout}\n${signature.stderr}`;
	if (signature.exitCode !== 0 || !details.includes(`TeamIdentifier=${teamId}`) || !details.includes('Developer ID Application')) {
		throw new Error(`The exported Safari app is not Developer ID signed for team ${teamId}.\n${details.trim()}`);
	}
}

async function packageSafari(input: {
	dmgPath: string;
	dryRun: boolean;
	notaryProfile: string;
	signIdentity: string;
	skipNotarize: boolean;
	teamId: string;
}): Promise<void> {
	const tempRoot = input.dryRun
		? join(tmpdir(), 'aria-clip-release-dry-run')
		: mkdtempSync(join(tmpdir(), 'aria-clip-release-'));
	const archivePath = join(tempRoot, 'Aria Clip.xcarchive');
	const exportPath = join(tempRoot, 'export');
	const exportPlist = join(tempRoot, 'ExportOptions.plist');
	const imageRoot = join(tempRoot, 'image');
	const appPath = join(exportPath, 'Aria Clip.app');

	try {
		if (!input.dryRun) await Bun.write(exportPlist, exportOptions(input.teamId));

		await run(
			[
				'xcodebuild',
				'-project', PROJECT,
				'-scheme', SCHEME,
				'-configuration', 'Release',
				'-destination', 'generic/platform=macOS',
				'-archivePath', archivePath,
				`DEVELOPMENT_TEAM=${input.teamId}`,
				'CODE_SIGN_STYLE=Automatic',
				'-allowProvisioningUpdates',
				'-quiet',
				'archive',
			],
			{ dryRun: input.dryRun }
		);

		await run(
			[
				'xcodebuild',
				'-exportArchive',
				'-archivePath', archivePath,
				'-exportPath', exportPath,
				'-exportOptionsPlist', exportPlist,
				'-allowProvisioningUpdates',
				'-quiet',
			],
			{ dryRun: input.dryRun }
		);

		if (!input.dryRun && !existsSync(appPath)) {
			const exportedApps = readdirSync(exportPath).filter(name => name.endsWith('.app'));
			throw new Error(`Xcode did not export Aria Clip.app. Exported apps: ${exportedApps.join(', ') || 'none'}`);
		}

		await run(['codesign', '--verify', '--deep', '--strict', '--verbose=2', appPath], { dryRun: input.dryRun });
		if (!input.dryRun) await verifySafariBundle(appPath, input.teamId);

		if (!input.dryRun) {
			mkdirSync(imageRoot, { recursive: true });
			await run(['ditto', appPath, join(imageRoot, 'Aria Clip.app')]);
			symlinkSync('/Applications', join(imageRoot, 'Applications'));
		}

		if (!input.dryRun && existsSync(input.dmgPath)) rmSync(input.dmgPath);
		await run(
			[
				'diskutil', 'image', 'create', 'from',
				'--format', 'UDZO',
				'--volumeName', 'Aria Clip',
				imageRoot,
				input.dmgPath,
			],
			{ dryRun: input.dryRun }
		);
		await run(['codesign', '--force', '--sign', input.signIdentity, '--timestamp', input.dmgPath], {
			dryRun: input.dryRun,
		});
		await run(['hdiutil', 'verify', input.dmgPath], { dryRun: input.dryRun });

		if (!input.skipNotarize) {
			await run(
				[
					'xcrun', 'notarytool', 'submit', input.dmgPath,
					...notaryAuthArgs(input.notaryProfile),
					'--wait',
					'--output-format', 'json',
				],
				{ dryRun: input.dryRun }
			);
			await run(['xcrun', 'stapler', 'staple', input.dmgPath], { dryRun: input.dryRun });
			await run(['xcrun', 'stapler', 'validate', input.dmgPath], { dryRun: input.dryRun });
			await run(
				['spctl', '--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=4', input.dmgPath],
				{ dryRun: input.dryRun }
			);
		}
	} finally {
		if (!input.dryRun && tempRoot.startsWith(join(tmpdir(), 'aria-clip-release-'))) {
			rmSync(tempRoot, { force: true, recursive: true });
		}
	}
}

async function sha256(path: string): Promise<string> {
	const hasher = new Bun.CryptoHasher('sha256');
	hasher.update(new Uint8Array(await Bun.file(path).arrayBuffer()));
	return hasher.digest('hex');
}

async function main(): Promise<void> {
	const options = parseOptions(process.argv.slice(2));
	loadEnv();

	if (platform() !== 'darwin' && !options.dryRun) {
		throw new Error('The complete release requires macOS because Safari packaging uses Xcode and Apple signing.');
	}

	const version = await readVersion();
	const teamId = DEFAULT_TEAM_ID;
	const notaryProfile = DEFAULT_NOTARY_PROFILE;
	const signIdentity = options.dryRun
		? `Developer ID Application (${teamId})`
		: await resolveSignIdentity(teamId);

	if (!options.dryRun) {
		requireTools(['bun', 'codesign', 'diskutil', 'ditto', 'hdiutil', 'security', 'unzip', 'xcodebuild', 'xcrun']);
		if (!options.skipNotarize) await preflightNotary(notaryProfile, teamId);
		mkdirSync(BUILDS, { recursive: true });
	}

	console.log(`Building Aria Clip ${version}`);
	console.log(`Apple team: ${teamId}`);
	console.log(`Signing identity: ${signIdentity}`);
	if (!options.skipNotarize) console.log(`Notary profile: ${notaryProfile}`);

	if (!options.skipChecks) {
		await run(['bun', 'run', 'typecheck'], { dryRun: options.dryRun });
		await run(['bun', 'run', 'test'], { dryRun: options.dryRun });
	}

	await run(['bun', 'run', 'build:chrome'], { dryRun: options.dryRun });
	await run(['bun', 'run', 'build:firefox'], { dryRun: options.dryRun });
	await run(['bun', 'run', 'build:safari'], { dryRun: options.dryRun });
	await run(['bun', 'run', 'build:firefox-source'], { dryRun: options.dryRun });

	const chromePath = join(BUILDS, `aria-clip-${version}-chrome.zip`);
	const firefoxPath = join(BUILDS, `aria-clip-${version}-firefox.zip`);
	const firefoxSourcePath = join(BUILDS, 'review', `aria-clip-${version}-firefox-source.zip`);
	const safariWebPath = join(BUILDS, `aria-clip-${version}-safari.zip`);
	const safariPath = join(BUILDS, `aria-clip-${version}-safari.dmg`);

	if (!options.dryRun) {
		await verifyWebArchive(chromePath, version);
		await verifyWebArchive(firefoxPath, version);
		if (!existsSync(firefoxSourcePath)) {
			throw new Error(`Expected Firefox review source was not created: ${firefoxSourcePath}`);
		}
	}

	await packageSafari({
		dmgPath: safariPath,
		dryRun: options.dryRun,
		notaryProfile,
		signIdentity,
		skipNotarize: options.skipNotarize,
		teamId,
	});

	if (options.dryRun) {
		console.log('\nDry run complete.');
		return;
	}

	if (existsSync(safariWebPath)) rmSync(safariWebPath);
	const artifacts = [chromePath, firefoxPath, safariPath];
	console.log('\nRelease artifacts:');
	for (const artifact of artifacts) {
		console.log(`${await sha256(artifact)}  ${basename(artifact)}`);
	}
	console.log('\nMozilla review source:');
	console.log(`${await sha256(firefoxSourcePath)}  ${basename(firefoxSourcePath)}`);
}

if (import.meta.main) {
	main().catch(error => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}

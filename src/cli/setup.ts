import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import {
	BROWSERS,
	BrowserCatalogSchema,
	HostSchema,
	SetupResultSchema,
	type Browser,
	type BrowserCatalog,
	type BrowserId,
	type Host,
	type SetupItem,
	type SetupResult,
} from '../schemas/browser.js';
import { fail } from './fault.js';
import { VERSION } from './version.js';

export interface Target {
	kind: 'app' | 'bin';
	path: string;
}

export interface SetupOpts {
	browsers?: BrowserId[];
	dryRun: boolean;
}

export interface SetupHost {
	platform: NodeJS.Platform;
	home: string;
	env: NodeJS.ProcessEnv;
	probe(path: string): Promise<boolean>;
	launch(target: Target, url: string, platform: Host): Promise<void>;
	catalog: BrowserCatalog;
}

const system: SetupHost = {
	platform: process.platform,
	home: homedir(),
	env: process.env,
	probe: async path => access(path, constants.F_OK).then(() => true, () => false),
	launch: async (target, url, platform) => {
		const command = platform === 'darwin' ? 'open' : target.path;
		const args = platform === 'darwin' ? ['-a', target.path, url] : [url];
		await new Promise<void>((resolve, reject) => {
			const child = spawn(command, args, { detached: true, stdio: 'ignore' });
			child.once('error', reject);
			child.once('spawn', () => {
				child.unref();
				resolve();
			});
		});
	},
	catalog: BROWSERS,
};

function tokens(host: SetupHost): Record<string, string | undefined> {
	return {
		home: host.home,
		programFiles: host.env.ProgramFiles,
		programFilesX86: host.env['ProgramFiles(x86)'],
		localAppData: host.env.LOCALAPPDATA,
	};
}

function expand(value: string, host: SetupHost): string | null {
	let missing = false;
	const output = value.replace(/\{([A-Za-z0-9]+)\}/g, (_match, key: string) => {
		const replacement = tokens(host)[key];
		if (!replacement) missing = true;
		return replacement ?? '';
	});
	return missing ? null : output;
}

async function findBin(names: readonly string[], host: SetupHost): Promise<string | null> {
	const dirs = (host.env.PATH ?? '').split(delimiter).filter(Boolean);
	const extensions = host.platform === 'win32'
		? (host.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean)
		: [''];
	for (const dir of dirs) {
		for (const name of names) {
			for (const extension of extensions) {
				const path = join(dir, host.platform === 'win32' && !name.toLowerCase().endsWith(extension.toLowerCase())
					? `${name}${extension.toLowerCase()}`
					: name);
				if (await host.probe(path)) return path;
			}
		}
	}
	return null;
}

async function detect(browser: Browser, platform: Host, host: SetupHost): Promise<Target | null> {
	const hints = browser.detect[platform];
	if (!hints) return null;
	for (const value of hints.apps) {
		const path = expand(value, host);
		if (path && await host.probe(path)) return { kind: 'app', path };
	}
	const path = await findBin(hints.bins, host);
	return path ? { kind: 'bin', path } : null;
}

function absent(browser: Browser, next = `Install ${browser.name}, then run setup again.`): SetupItem {
	return {
		id: browser.id,
		name: browser.name,
		detected: false,
		state: 'not-detected',
		route: browser.route,
		launched: false,
		confirmationRequired: false,
		next,
	};
}

function pending(browser: Browser): SetupItem {
	if (browser.route.kind !== 'unpublished') throw new Error('Expected an unpublished browser route.');
	return {
		id: browser.id,
		name: browser.name,
		detected: true,
		state: 'unpublished',
		route: browser.route,
		launched: false,
		confirmationRequired: false,
		next: browser.route.reason,
	};
}

function ready(browser: Browser): SetupItem {
	return {
		id: browser.id,
		name: browser.name,
		detected: true,
		state: 'ready',
		route: browser.route,
		launched: false,
		confirmationRequired: true,
		next: `Run setup without --dry-run, then confirm installation in ${browser.name}.`,
	};
}

function launched(browser: Browser): SetupItem {
	return {
		id: browser.id,
		name: browser.name,
		detected: true,
		state: 'confirmation-required',
		route: browser.route,
		launched: true,
		confirmationRequired: true,
		next: `Complete the installation and enable Aria Clip in ${browser.name}.`,
	};
}

export async function setup(opts: SetupOpts, host: SetupHost = system): Promise<SetupResult> {
	const parsed = HostSchema.safeParse(host.platform);
	if (!parsed.success) fail('E_SETUP_FAILED', `Browser setup does not support ${host.platform}.`, 'setup', {
		hint: 'Use macOS, Linux, or Windows, or install the browser extension manually.',
	});
	const platform = parsed.data;
	const catalog = BrowserCatalogSchema.parse(host.catalog);
	const requested = opts.browsers ?? catalog.browsers
		.filter(browser => browser.platforms.includes(platform))
		.map(browser => browser.id);
	const browsers: SetupItem[] = [];
	for (const id of requested) {
		const browser = catalog.browsers.find(candidate => candidate.id === id);
		if (!browser) fail('E_SETUP_FAILED', `The browser distribution catalog is missing ${id}.`, 'setup');
		if (!browser.platforms.includes(platform)) {
			browsers.push(absent(browser, `${browser.name} is not supported on ${platform}.`));
			continue;
		}
		const found = await detect(browser, platform, host);
		if (!found) {
			browsers.push(absent(browser));
			continue;
		}
		if (browser.route.kind === 'unpublished') {
			browsers.push(pending(browser));
			continue;
		}
		if (opts.dryRun) {
			browsers.push(ready(browser));
			continue;
		}
		try {
			await host.launch(found, browser.route.url, platform);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			fail('E_SETUP_FAILED', `Could not open the ${browser.name} installation surface: ${message}`, 'setup', {
				hint: `Open ${browser.route.url} in ${browser.name}.`,
			});
		}
		browsers.push(launched(browser));
	}

	return SetupResultSchema.parse({
		schemaVersion: '1',
		version: VERSION,
		platform,
		dryRun: opts.dryRun,
		browsers,
	});
}

import { execFile } from 'child_process';
import { promisify } from 'util';
import { sanitizeFileName } from './string-utils';
import { Template } from '../types/types';

const execFileAsync = promisify(execFile);

/**
 * Check if the `aria` CLI is available on PATH.
 */
async function hasAriaCli(): Promise<boolean> {
	try {
		await execFileAsync('aria', ['version']);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create/append/prepend a note via the Aria CLI.
 */
async function openViaAriaCli(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean
): Promise<string> {
	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';
	const vaultArgs = vault ? [`vault=${vault}`] : [];

	if (isDailyNote) {
		const command = behavior === 'append-daily' ? 'daily:append' : 'daily:prepend';
		const { stdout } = await execFileAsync('aria', [
			command,
			`content=${fileContent}`,
			...vaultArgs,
		]);
		return stdout.trim();
	}

	const normalizedPath = path && !path.endsWith('/') ? path + '/' : path;
	const formattedNoteName = sanitizeFileName(noteName);
	const filePath = normalizedPath + formattedNoteName + '.md';

	if (behavior === 'append-specific' || behavior === 'prepend-specific') {
		const command = behavior === 'append-specific' ? 'append' : 'prepend';
		const { stdout } = await execFileAsync('aria', [
			command,
			`path=${filePath}`,
			`content=${fileContent}`,
			...vaultArgs,
		]);
		return stdout.trim();
	}

	// create or overwrite
	const args = [
		'create',
		`path=${filePath}`,
		`content=${fileContent}`,
		'open',
		...vaultArgs,
	];
	if (behavior === 'overwrite') {
		args.push('overwrite');
	}

	const { stdout } = await execFileAsync('aria', args);
	return stdout.trim();
}

/**
 * Open a note in Aria via URI scheme (fallback / legacy mode).
 */
async function openViaUri(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean
): Promise<void> {
	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';

	let ariaUrl: string;
	if (isDailyNote) {
		ariaUrl = `aria://daily?`;
	} else {
		const normalizedPath = path && !path.endsWith('/') ? path + '/' : path;
		const formattedNoteName = sanitizeFileName(noteName);
		ariaUrl = `aria://new?file=${encodeURIComponent(normalizedPath + formattedNoteName)}`;
	}

	if (behavior.startsWith('append')) {
		ariaUrl += '&append=true';
	} else if (behavior.startsWith('prepend')) {
		ariaUrl += '&prepend=true';
	} else if (behavior === 'overwrite') {
		ariaUrl += '&overwrite=true';
	}

	if (vault) {
		ariaUrl += `&vault=${encodeURIComponent(vault)}`;
	}

	if (silent) {
		ariaUrl += '&silent=true';
	}

	ariaUrl += `&content=${encodeURIComponent(fileContent)}`;

	const platform = process.platform;
	if (platform === 'darwin') {
		await execFileAsync('open', [ariaUrl]);
	} else if (platform === 'win32') {
		await execFileAsync('powershell', ['-Command', 'Start-Process', '-Uri', ariaUrl]);
	} else {
		await execFileAsync('xdg-open', [ariaUrl]);
	}
}

/**
 * Send a note to Aria. Uses the Aria CLI by default,
 * falls back to URI scheme if --uri is set or CLI is not available.
 */
export async function openInAria(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean,
	forceUri: boolean
): Promise<string> {
	if (!forceUri && await hasAriaCli()) {
		const result = await openViaAriaCli(fileContent, noteName, path, vault, behavior, silent);
		return result;
	}

	await openViaUri(fileContent, noteName, path, vault, behavior, silent);
	return `Opened in Aria${vault ? ` (vault: ${vault})` : ''}`;
}

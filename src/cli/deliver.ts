import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { ariaInfo, sendAria } from '../integrations/aria/cli-delivery.js';
import { ariaHome } from '../platform/node/env.js';
import type { Capture } from '../schemas/capture.js';
import type { RunOpts } from './args.js';
import { fail, Fault } from './fault.js';
import type { DeliveryKind, Result } from './schema.js';

export interface DeliveryInput {
	capture: Capture;
	opts: RunOpts;
}

export function deliveryKind(opts: RunOpts): DeliveryKind {
	if (opts.add || opts.open) return 'aria';
	if (opts.save !== undefined || opts.output) return 'file';
	return opts.to ?? 'stdout';
}

async function destination(input: DeliveryInput): Promise<string> {
	const explicit = input.opts.output ?? (typeof input.opts.save === 'string' ? input.opts.save : undefined);
	if (!explicit) {
		const folder = input.capture.location.folder.trim();
		const parts = folder.split(/[\\/]+/).filter(Boolean);
		if (isAbsolute(folder) || /^[A-Za-z]:/.test(folder) || parts.some(part => part === '.' || part === '..')) {
			fail('E_TEMPLATE_INVALID', `Template folder must be vault-relative: ${folder}`, 'deliver');
		}
		return join(ariaHome(), 'vault', ...parts, input.capture.rendering.fileName);
	}
	const path = isAbsolute(explicit) ? explicit : resolve(explicit);
	try {
		return (await stat(path)).isDirectory() ? join(path, input.capture.rendering.fileName) : path;
	} catch {
		return explicit.endsWith('/') || explicit.endsWith('\\')
			? join(path, input.capture.rendering.fileName)
			: path;
	}
}

async function atomic(path: string, markdown: string, overwrite: boolean): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
	try {
		await writeFile(temp, markdown, { encoding: 'utf8', flag: 'wx' });
		if (overwrite) {
			await rename(temp, path);
		} else {
			try {
				await link(temp, path);
			} catch (error) {
				const code = error instanceof Error && 'code' in error ? error.code : undefined;
				if (code === 'EEXIST') {
					fail('E_DELIVERY_CONFLICT', `File already exists: ${path}`, 'deliver', {
						hint: 'Choose another path or pass --overwrite.',
					});
				}
				throw error;
			}
			await unlink(temp);
		}
	} catch (error) {
		await unlink(temp).catch(() => undefined);
		if (error instanceof Fault) throw error;
		fail('E_DELIVERY_FAILED', error instanceof Error ? error.message : `Could not write ${path}.`, 'deliver');
	}
}

export async function deliver(input: DeliveryInput): Promise<Result['delivery']> {
	const requested = deliveryKind(input.opts);
	const { capture, opts } = input;
	const { location } = capture;
	const markdown = capture.capture.renderedMarkdown;
	if (opts.dryRun || requested === 'stdout') {
		return { requested, performed: false, behavior: location.behavior };
	}

	if (requested === 'file') {
		const path = await destination(input);
		await atomic(path, markdown, opts.overwrite);
		return {
			requested,
			performed: true,
			path,
			hash: `sha256:${createHash('sha256').update(markdown).digest('hex')}`,
			behavior: location.behavior,
		};
	}

	const aria = await ariaInfo();
	if (!aria.available) {
		fail('E_ARIA_UNAVAILABLE',
			aria.installed
				? 'Aria does not advertise clip.capture.v1 intake.'
				: 'The downstream aria command is not available.',
			'capability', {
				hint: aria.installed
					? 'Update Aria after capture intake ships, or use --save in the meantime.'
					: 'Install Aria or use --save.',
				exit: 8,
			});
	}

	try {
		const ack = await sendAria(capture, opts.timeout);
		return {
			requested,
			performed: true,
			behavior: location.behavior,
			identity: ack.identity,
			destination: ack.destination,
		};
	} catch (error) {
		fail('E_DELIVERY_FAILED', error instanceof Error ? error.message : 'Aria capture delivery failed.', 'deliver', {
			retryable: true,
		});
	}
}

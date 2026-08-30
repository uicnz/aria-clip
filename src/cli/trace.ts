import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fail } from './fault.js';
import { TraceSchema, type Result, type Trace } from './schema.js';
import { PROTOCOL } from './version.js';

function safe(raw: string): string {
	const url = new URL(raw);
	url.username = '';
	url.password = '';
	url.search = '';
	url.hash = '';
	return url.href;
}

export function trace(result: Result): Trace {
	return TraceSchema.parse({
		schemaVersion: PROTOCOL,
		createdAt: new Date().toISOString(),
		command: result.command,
		source: {
			requestedUrl: safe(result.input.requestedUrl),
			finalUrl: safe(result.input.finalUrl),
			kind: result.input.source,
			bytes: result.input.bytes,
			hash: result.input.hash,
		},
		template: {
			id: result.template.id,
			source: result.template.source,
			hash: result.template.hash,
		},
		interpreter: result.interpreter,
		delivery: {
			requested: result.delivery.requested,
			performed: result.delivery.performed,
			behavior: result.delivery.behavior,
		},
		warnings: result.warnings,
		timingMs: result.timingMs,
	});
}

export async function writeTrace(path: string, result: Result): Promise<string> {
	const target = resolve(path);
	await mkdir(dirname(target), { recursive: true });
	const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await writeFile(temp, `${JSON.stringify(trace(result), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
		await rename(temp, target);
		return target;
	} catch (error) {
		await unlink(temp).catch(() => undefined);
		fail('E_DELIVERY_FAILED', error instanceof Error ? error.message : `Could not write trace ${target}.`, 'deliver');
	}
}

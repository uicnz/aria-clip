import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { CaptureAckSchema, sessionStart, type Capture, type CaptureAck } from '../../schemas/capture.js';

const exec = promisify(execFile);

export interface AriaInfo {
	installed: boolean;
	available: boolean;
	version: string | null;
}

export interface AriaRun {
	bin: string;
	args: readonly string[];
}

const DEFAULT_RUN: AriaRun = { bin: 'aria', args: [] };

async function output(args: string[], run: AriaRun): Promise<string | null> {
	try {
		const result = await exec(run.bin, [...run.args, ...args], { timeout: 5_000 });
		return result.stdout.trim();
	} catch {
		return null;
	}
}

/** Inspect the downstream Aria Agent without invoking its interactive UI. */
export async function ariaInfo(run: AriaRun = DEFAULT_RUN): Promise<AriaInfo> {
	const version = await output(['--version'], run);
	if (!version) return { installed: false, available: false, version: null };
	return { installed: true, available: true, version };
}

/** Retained as a small compatibility helper for callers that only need a version. */
export async function ariaVersion(): Promise<string | null> {
	return (await ariaInfo()).version;
}

/** One native-messaging frame: a 4-byte little-endian byte length followed by UTF-8 JSON. */
export function frame(message: object): Buffer {
	const body = Buffer.from(JSON.stringify(message), 'utf8');
	const header = Buffer.alloc(4);
	header.writeUInt32LE(body.length, 0);
	return Buffer.concat([header, body]);
}

/** Read the first complete frame, or null when the stream ended before one arrived. */
export function unframe(bytes: Buffer): unknown {
	if (bytes.length < 4) return null;
	const length = bytes.readUInt32LE(0);
	if (bytes.length < 4 + length) return null;
	return JSON.parse(bytes.subarray(4, 4 + length).toString('utf8'));
}

function ingest(capture: Capture, timeout: number, run: AriaRun): Promise<CaptureAck> {
	return new Promise((resolve, reject) => {
		const child = spawn(run.bin, [...run.args, '--deeplink'], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		const stdout: Buffer[] = [];
		let stderr = '';
		let settled = false;
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`Aria DeepLink timed out after ${timeout}ms.`));
		}, timeout);

		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk: Buffer) => { stdout.push(chunk); });
		child.stderr.on('data', (chunk: string) => { stderr += chunk; });
		child.stdin.on('error', () => undefined);
		child.once('error', (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			reject(error);
		});
		child.once('close', (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				const reply = unframe(Buffer.concat(stdout));
				if (reply === null) {
					if (code !== 0) throw new Error(stderr.trim() || `Aria DeepLink exited with status ${code ?? 'unknown'}.`);
					throw new Error('no reply frame');
				}
				resolve(CaptureAckSchema.parse(reply));
			} catch (error) {
				reject(new Error(`Aria returned an invalid DeepLink reply: ${error instanceof Error ? error.message : 'unknown error'}`));
			}
		});

		child.stdin.end(frame(sessionStart(capture)));
	});
}

/** Deliver a versioned capture envelope through `aria --deeplink` as a `session.start` request. */
export async function sendAria(capture: Capture, timeout: number, run: AriaRun = DEFAULT_RUN): Promise<Extract<CaptureAck, { ok: true }>> {
	const ack = await ingest(capture, timeout, run);
	if (!ack.ok) throw new Error(`${ack.message} (${ack.code})`);
	return ack;
}

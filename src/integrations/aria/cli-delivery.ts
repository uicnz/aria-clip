import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { CaptureAckSchema, CaptureSchema, type Capture, type CaptureAck } from '../../schemas/capture.js';

const exec = promisify(execFile);
const SUPPORT = 'clip.capture.v1';

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
	const supported = await output(['--supports', SUPPORT], run);
	return {
		installed: true,
		available: supported?.toLowerCase() === 'true',
		version,
	};
}

/** Retained as a small compatibility helper for callers that only need a version. */
export async function ariaVersion(): Promise<string | null> {
	return (await ariaInfo()).version;
}

function ingest(capture: Capture, timeout: number, run: AriaRun): Promise<CaptureAck> {
	return new Promise((resolve, reject) => {
		const child = spawn(run.bin, [...run.args, 'clip', 'add', '--input', '-', '--json'], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		let settled = false;
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`Aria intake timed out after ${timeout}ms.`));
		}, timeout);

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk: string) => { stdout += chunk; });
		child.stderr.on('data', (chunk: string) => { stderr += chunk; });
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
			if (code !== 0) {
				reject(new Error(stderr.trim() || `Aria intake exited with status ${code ?? 'unknown'}.`));
				return;
			}
			try {
				resolve(CaptureAckSchema.parse(JSON.parse(stdout)));
			} catch (error) {
				reject(new Error(`Aria returned an invalid capture acknowledgement: ${error instanceof Error ? error.message : 'unknown error'}`));
			}
		});

		child.stdin.end(`${JSON.stringify(CaptureSchema.parse(capture))}\n`);
	});
}

/** Deliver a versioned capture envelope through Aria's capability-gated intake. */
export async function sendAria(capture: Capture, timeout: number, run: AriaRun = DEFAULT_RUN): Promise<Extract<CaptureAck, { ok: true }>> {
	const ack = await ingest(capture, timeout, run);
	if (!ack.ok) throw new Error(`${ack.message} (${ack.code})`);
	return ack;
}

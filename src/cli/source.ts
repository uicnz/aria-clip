import { lookup } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { RunOpts } from './args.js';
import { UrlSchema } from './args.js';
import { fail } from './fault.js';
import { SourceKindSchema, type SourceKind } from './schema.js';
import { VERSION } from './version.js';

export const EnvelopeSchema = z.strictObject({
	schemaVersion: z.literal('1'),
	url: UrlSchema,
	html: z.string().min(1),
});

export interface Source {
	requestedUrl: string;
	finalUrl: string;
	kind: SourceKind;
	html: string;
	bytes: number;
	redirects: string[];
	contentType: string;
	fetchedAt: string | null;
}

function privateV4(address: string): boolean {
	const parts = address.split('.').map(Number);
	const [a, b] = parts;
	return a === 0
		|| a === 10
		|| a === 127
		|| (a === 169 && b === 254)
		|| (a === 172 && b !== undefined && b >= 16 && b <= 31)
		|| (a === 192 && b === 168)
		|| (a === 100 && b !== undefined && b >= 64 && b <= 127)
		|| (a !== undefined && a >= 224);
}

function privateIp(address: string): boolean {
	if (isIP(address) === 4) return privateV4(address);
	if (isIP(address) !== 6) return false;
	const value = address.toLowerCase();
	return value === '::1'
		|| value === '::'
		|| value.startsWith('fc')
		|| value.startsWith('fd')
		|| value.startsWith('fe8')
		|| value.startsWith('fe9')
		|| value.startsWith('fea')
		|| value.startsWith('feb')
		|| (value.startsWith('::ffff:') && privateV4(value.slice(7)));
}

async function guard(url: URL, allowPrivate: boolean): Promise<void> {
	if (allowPrivate) return;
	const rawHost = url.hostname.toLowerCase();
	const host = rawHost.startsWith('[') && rawHost.endsWith(']') ? rawHost.slice(1, -1) : rawHost;
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || privateIp(host)) {
		fail('E_PRIVATE_NETWORK', `Private network target ${host} is not allowed.`, 'fetch', {
			hint: 'Use --allow-private-network only for a target you trust.',
		});
	}

	let addresses: Array<{ address: string; family: number }>;
	try {
		addresses = await lookup(host, { all: true });
	} catch (error) {
		fail('E_FETCH_FAILED', error instanceof Error ? error.message : `Could not resolve ${host}.`, 'fetch', {
			retryable: true,
		});
	}
	if (addresses.some(entry => privateIp(entry.address))) {
		fail('E_PRIVATE_NETWORK', `Target ${host} resolves to a private network address.`, 'fetch', {
			hint: 'Use --allow-private-network only for a target you trust.',
		});
	}
}

async function body(response: Response, maxBytes: number): Promise<{ html: string; bytes: number }> {
	const declared = Number(response.headers.get('content-length') ?? 0);
	if (declared > maxBytes) {
		fail('E_RESPONSE_TOO_LARGE', `Response declares ${declared} bytes; limit is ${maxBytes}.`, 'fetch');
	}
	if (!response.body) fail('E_CONTENT_UNAVAILABLE', 'The source returned an empty response body.', 'fetch');

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	while (true) {
		const chunk = await reader.read();
		if (chunk.done) break;
		bytes += chunk.value.byteLength;
		if (bytes > maxBytes) {
			await reader.cancel();
			fail('E_RESPONSE_TOO_LARGE', `Response exceeded the ${maxBytes} byte limit.`, 'fetch');
		}
		chunks.push(chunk.value);
	}

	const merged = new Uint8Array(bytes);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { html: new TextDecoder().decode(merged), bytes };
}

async function network(requestedUrl: string, opts: RunOpts): Promise<Source> {
	let url = new URL(requestedUrl);
	const redirects: string[] = [];
	for (let redirect = 0; redirect <= 10; redirect += 1) {
		await guard(url, opts.allowPrivateNetwork);
		let response: Response;
		try {
			response = await fetch(url, {
				redirect: 'manual',
				signal: AbortSignal.timeout(opts.timeout),
				headers: { 'user-agent': `Aria-Clip/${VERSION} (+https://docs.aria.bot)` },
			});
		} catch (error) {
			const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
			fail(timeout ? 'E_FETCH_TIMEOUT' : 'E_FETCH_FAILED', error instanceof Error ? error.message : 'Fetch failed.', 'fetch', {
				retryable: true,
				exit: timeout ? 9 : 3,
			});
		}

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) fail('E_FETCH_FAILED', `Redirect ${response.status} did not include a location.`, 'fetch');
			url = new URL(location, url);
			redirects.push(url.href);
			continue;
		}
		if (!response.ok) {
			fail('E_FETCH_FAILED', `Source returned HTTP ${response.status} ${response.statusText}.`, 'fetch', {
				retryable: response.status === 429 || response.status >= 500,
			});
		}

		const type = response.headers.get('content-type')?.toLowerCase() ?? '';
		if (type && !type.includes('html') && !type.startsWith('text/')) {
			fail('E_CONTENT_UNAVAILABLE', `Unsupported content type: ${type}.`, 'fetch', {
				hint: 'Aria Clip currently accepts HTML and text pages.',
			});
		}
		const result = await body(response, opts.maxBytes);
		return {
			requestedUrl,
			finalUrl: url.href,
			kind: 'network',
			redirects,
			contentType: type || 'text/html',
			fetchedAt: new Date().toISOString(),
			...result,
		};
	}

	fail('E_FETCH_FAILED', 'The source exceeded the 10 redirect limit.', 'fetch');
}

async function text(path: string): Promise<string> {
	try {
		if (path !== '-') return await readFile(resolve(path), 'utf8');
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks).toString('utf8');
	} catch (error) {
		fail('E_INPUT_FAILED', error instanceof Error ? error.message : `Could not read ${path}.`, 'input');
	}
}

export async function loadSource(requestedUrl: string, opts: RunOpts): Promise<Source> {
	if (opts.input) {
		const envelope = EnvelopeSchema.parse(JSON.parse(await text(opts.input)));
		return {
			requestedUrl,
			finalUrl: envelope.url,
			kind: SourceKindSchema.parse('envelope'),
			html: envelope.html,
			bytes: new TextEncoder().encode(envelope.html).byteLength,
			redirects: [],
			contentType: 'text/html',
			fetchedAt: null,
		};
	}
	if (opts.html) {
		const html = await text(opts.html);
		return {
			requestedUrl,
			finalUrl: requestedUrl,
			kind: opts.html === '-' ? 'stdin' : 'file',
			html,
			bytes: new TextEncoder().encode(html).byteLength,
			redirects: [],
			contentType: 'text/html',
			fetchedAt: null,
		};
	}
	return network(requestedUrl, opts);
}

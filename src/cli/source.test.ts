import { describe, expect, test } from 'bun:test';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { RunOptsSchema } from './args.js';
import { Fault } from './fault.js';
import { loadSource } from './source.js';

const servers: Server[] = [];

async function serve(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<string> {
	const server = createServer(handler);
	servers.push(server);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Fixture server did not bind.');
	return `http://127.0.0.1:${address.port}`;
}

async function close(): Promise<void> {
	await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
		if (!server.listening) {
			resolve();
			return;
		}
		server.close(error => error ? reject(error) : resolve());
		server.closeAllConnections();
	})));
}

describe('CLI source safety', () => {
	test('records a bounded redirect chain from the fixture server', async () => {
		const root = await serve((request, response) => {
			if (request.url === '/start') {
				response.writeHead(302, { location: '/article' });
				response.end();
				return;
			}
			response.writeHead(200, { 'content-type': 'text/html' });
			response.end('<html><article>Redirected</article></html>');
		});
		try {
			const source = await loadSource(`${root}/start`, RunOptsSchema.parse({ allowPrivateNetwork: true }));
			expect(source.finalUrl).toBe(`${root}/article`);
			expect(source.redirects).toEqual([`${root}/article`]);
			expect(source.contentType).toBe('text/html');
		} finally {
			await close();
		}
	});

	test('rejects unsupported content types before parsing', async () => {
		const root = await serve((_request, response) => {
			response.writeHead(200, { 'content-type': 'image/png' });
			response.end('not an image');
		});
		try {
			await expect(loadSource(root, RunOptsSchema.parse({ allowPrivateNetwork: true }))).rejects.toMatchObject({
				detail: { code: 'E_CONTENT_UNAVAILABLE', stage: 'fetch' },
			});
		} finally {
			await close();
		}
	});

	test('enforces the response-size limit from headers', async () => {
		const root = await serve((_request, response) => {
			response.writeHead(200, { 'content-type': 'text/html', 'content-length': '1000' });
			response.end('<html></html>');
		});
		try {
			await expect(loadSource(root, RunOptsSchema.parse({ allowPrivateNetwork: true, maxBytes: 50 }))).rejects.toMatchObject({
				detail: { code: 'E_RESPONSE_TOO_LARGE', stage: 'fetch' },
			});
		} finally {
			await close();
		}
	});

	test('classifies retryable HTTP failures', async () => {
		const root = await serve((_request, response) => {
			response.writeHead(503, { 'content-type': 'text/plain' });
			response.end('busy');
		});
		try {
			await expect(loadSource(root, RunOptsSchema.parse({ allowPrivateNetwork: true }))).rejects.toMatchObject({
				detail: { code: 'E_FETCH_FAILED', retryable: true },
			});
		} finally {
			await close();
		}
	});

	test('maps an elapsed request deadline to the timeout family', async () => {
		const root = await serve(() => undefined);
		try {
			await expect(loadSource(root, RunOptsSchema.parse({ allowPrivateNetwork: true, timeout: 10 }))).rejects.toMatchObject({
				detail: { code: 'E_FETCH_TIMEOUT', stage: 'fetch' },
				exit: 9,
			});
		} finally {
			await close();
		}
	});

	test.each([
		'http://127.0.0.1/private',
		'http://[::1]/private',
		'http://localhost/private',
	])('blocks private target %s', async url => {
		await expect(loadSource(url, RunOptsSchema.parse({}))).rejects.toMatchObject({
			detail: { code: 'E_PRIVATE_NETWORK', stage: 'fetch' },
		});
	});

	test('classifies a saved envelope independently of stdin transport', async () => {
		const url = 'https://example.com/envelope';
		const path = fileURLToPath(new URL('./fixtures/envelope.json', import.meta.url));
		const source = await loadSource(url, RunOptsSchema.parse({ input: path }));
		expect(source).toMatchObject({ requestedUrl: url, finalUrl: url, kind: 'envelope' });
	});

	test('uses a typed fault for a missing input file', async () => {
		try {
			await loadSource('https://example.com', RunOptsSchema.parse({ html: '/definitely/missing/aria.html' }));
			throw new Error('Expected input failure');
		} catch (error) {
			expect(error).toBeInstanceOf(Fault);
			expect(error).toMatchObject({ detail: { code: 'E_INPUT_FAILED' } });
		}
	});
});

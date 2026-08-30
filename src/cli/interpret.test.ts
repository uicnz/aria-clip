import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test } from 'bun:test';
import { ConfigSchema } from './config.js';
import { interpret, resolveModel } from './interpret.js';

const servers: Server[] = [];

afterEach(async () => {
	await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
		server.close(error => error ? reject(error) : resolve());
	})));
});

async function provider(body: string, status = 200): Promise<string> {
	const server = createServer((_request, response) => {
		response.writeHead(status, { 'content-type': 'application/json' });
		response.end(body);
	});
	servers.push(server);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Mock provider did not bind a TCP port.');
	return `http://127.0.0.1:${address.port}/v1/chat/completions`;
}

function config(baseUrl: string) {
	return ConfigSchema.parse({
		defaultModel: 'mock/test-model',
		models: ['mock/test-model'],
		providers: { mock: { api: 'openai', baseUrl } },
	});
}

describe('CLI Interpreter', () => {
	test('resolves the flag before a configured or template-supplied default', () => {
		const value = config('https://example.com/v1');
		expect(resolveModel(undefined, value)).toEqual({ provider: 'mock', model: 'test-model' });
		expect(resolveModel('mock/override', value)).toEqual({ provider: 'mock', model: 'override' });
	});

	test('executes a configured OpenAI-compatible model', async () => {
		const baseUrl = await provider(JSON.stringify({
			choices: [{ message: { content: '# Interpreted\n' } }],
		}));
		await expect(interpret({
			prompt: 'Write notes.',
			context: 'Source context.',
			config: config(baseUrl),
			timeout: 5_000,
		})).resolves.toEqual({
			markdown: '# Interpreted',
			provider: 'mock',
			model: 'test-model',
		});
	});

	test('maps malformed provider payloads to the interpret error family', async () => {
		const baseUrl = await provider('{"choices":[]}');
		await expect(interpret({
			prompt: 'Write notes.',
			context: 'Source context.',
			config: config(baseUrl),
			timeout: 5_000,
		})).rejects.toMatchObject({
			detail: { code: 'E_PROVIDER_FAILED', stage: 'interpret' },
			exit: 6,
		});
	});

	test('reports provider HTTP failures as retryable when appropriate', async () => {
		const baseUrl = await provider('{"error":"busy"}', 503);
		await expect(interpret({
			prompt: 'Write notes.',
			context: 'Source context.',
			config: config(baseUrl),
			timeout: 5_000,
		})).rejects.toMatchObject({
			detail: { code: 'E_PROVIDER_FAILED', retryable: true },
		});
	});
});

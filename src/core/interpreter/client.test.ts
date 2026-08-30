import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';
import type { Api } from '../../schemas/model.js';
import { apiFor, complete } from './client.js';

const JsonObjectSchema = z.record(z.string(), z.json());

interface Seen {
	path: string;
	headers: Record<string, string | string[] | undefined>;
	body: z.infer<typeof JsonObjectSchema>;
}

const servers: Server[] = [];

afterEach(async () => {
	await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
		server.close(error => error ? reject(error) : resolve());
	})));
});

async function fixture(reply: z.infer<typeof JsonObjectSchema>): Promise<{ baseUrl: string; seen: Seen[] }> {
	const seen: Seen[] = [];
	const server = createServer(async (request, response) => {
		let raw = '';
		for await (const chunk of request) raw += chunk.toString();
		seen.push({
			path: request.url ?? '/',
			headers: request.headers,
			body: JsonObjectSchema.parse(JSON.parse(raw)),
		});
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify(reply));
	});
	servers.push(server);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Fixture provider did not bind a TCP port.');
	return { baseUrl: `http://127.0.0.1:${address.port}`, seen };
}

function reply(api: Api): z.infer<typeof JsonObjectSchema> {
	if (api === 'anthropic') return { content: [{ type: 'text', text: 'done' }], stop_reason: 'end_turn' };
	if (api === 'gemini') return { candidates: [{ content: { parts: [{ text: 'done' }] }, finishReason: 'STOP' }] };
	if (api === 'ollama') return { message: { content: 'done' }, done_reason: 'stop' };
	return { choices: [{ message: { content: 'done' }, finish_reason: 'stop' }] };
}

describe('shared interpreter client', () => {
	test('keeps legacy provider inference in one compatibility boundary', () => {
		expect(apiFor({ name: 'Anthropic', baseUrl: 'https://example.com/v1' })).toBe('anthropic');
		expect(apiFor({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model-id}:generateContent' })).toBe('gemini');
		expect(apiFor({ name: 'Custom', baseUrl: 'https://example.com/v1/chat/completions' })).toBe('openai');
	});

	test('executes every catalog API adapter through one transport', async () => {
		const apis: Api[] = ['anthropic', 'azure', 'deepseek', 'gemini', 'huggingface', 'ollama', 'openai', 'perplexity'];
		for (const api of apis) {
			const target = await fixture(reply(api));
			const baseUrl = api === 'azure'
				? `${target.baseUrl}/{deployment-id}`
				: api === 'gemini' || api === 'huggingface'
					? `${target.baseUrl}/{model-id}`
					: target.baseUrl;
			await expect(complete({
				target: { api, baseUrl },
				model: 'test-model',
				key: 'secret',
				system: 'system',
				messages: [{ role: 'user', content: 'prompt' }],
				json: true,
			})).resolves.toBe('done');
			expect(target.seen).toHaveLength(1);
			if (api === 'azure' || api === 'gemini' || api === 'huggingface') {
				expect(target.seen[0].path).toBe('/test-model');
			}
			if (api === 'deepseek') expect(target.seen[0].body.thinking).toEqual({ type: 'disabled' });
			if (api === 'gemini') expect(target.seen[0].headers['x-goog-api-key']).toBe('secret');
			if (api === 'ollama') expect(target.seen[0].body.format).toBe('json');
		}
	});
});

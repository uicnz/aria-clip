import { afterEach, describe, expect, test } from 'bun:test';
import { generalSettings } from '../../platform/browser/storage-utils.js';
import type { ModelConfig, Provider } from '../../types/types.js';
import { BUILTIN_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../templates/builtin-templates.js';
import { compileTemplate } from '../templates/engine/template-compiler.js';
import { sendToLLM } from './interpreter.js';

const fetchOriginal = globalThis.fetch;
const providersOriginal = generalSettings.providers;

afterEach(() => {
	globalThis.fetch = fetchOriginal;
	generalSettings.providers = providersOriginal;
});

describe('Interpreter source context', () => {
	test('compiles the complete body unchanged into every builtin interpreter template', async () => {
		const body = `BEGIN-SOURCE\n${'substantive source material\n'.repeat(4_000)}END-SOURCE`;
		const variables = {
			'{{title}}': 'Title',
			'{{url}}': 'https://example.com/source',
			'{{author}}': 'Author',
			'{{published}}': '2026-08-31',
			'{{description}}': 'Description',
			'{{content}}': body,
		};

		for (const definition of BUILTIN_TEMPLATES.filter(item => item.id !== DEFAULT_TEMPLATE_ID)) {
			const template = definition.create();
			const context = await compileTemplate(0, template.context ?? '', variables, variables['{{url}}']);
			expect(context, definition.name).toContain(body);
			expect(context.indexOf('BEGIN-SOURCE'), definition.name).toBeLessThan(context.indexOf('END-SOURCE'));
		}
	});

	test('sends the compiled context to the provider without truncation', async () => {
		const provider: Provider = {
			id: 'test',
			name: 'Test',
			api: 'openai',
			baseUrl: 'https://example.com/v1/chat/completions',
			apiKey: 'secret',
			apiKeyRequired: true,
		};
		const model: ModelConfig = {
			id: 'test-model',
			providerId: provider.id,
			providerModelId: 'test-model',
			name: 'Test Model',
			enabled: true,
		};
		const context = `BEGIN-CONTEXT\n${'complete body\n'.repeat(8_000)}END-CONTEXT`;
		let request: { messages?: Array<{ role?: string; content?: string }> } = {};
		generalSettings.providers = [provider];
		const mockFetch = Object.assign(async (_input: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => {
			request = JSON.parse(String(init?.body));
			return new Response(JSON.stringify({
				choices: [{ finish_reason: 'stop', message: { content: '{"prompts_responses":{"prompt_1":"done"}}' } }],
			}), { status: 200, headers: { 'content-type': 'application/json' } });
		}, { preconnect: fetchOriginal.preconnect });
		globalThis.fetch = mockFetch;

		await sendToLLM(context, '', [{ key: 'prompt_1', prompt: 'Process the complete source.' }], model);

		expect(request.messages?.[1]?.content).toBe(context);
		expect(request.messages?.[1]?.content?.startsWith('BEGIN-CONTEXT')).toBe(true);
		expect(request.messages?.[1]?.content?.endsWith('END-CONTEXT')).toBe(true);
		expect(request.messages?.[0]?.content).not.toContain('Make your responses concise');
	});
});

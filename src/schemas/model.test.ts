import data from '../../providers.json' with { type: 'json' };
import { describe, expect, test } from 'bun:test';
import { CatalogSchema, ModelRefSchema } from './model.js';

describe('model schemas', () => {
	test('validates the canonical provider catalog', () => {
		const catalog = CatalogSchema.parse(data);
		expect(Object.keys(catalog.providers)).toHaveLength(12);
		expect(catalog.providers.openai.api).toBe('openai');
	});

	test('uses the main Aria credential names for shared providers', () => {
		const providers = CatalogSchema.parse(data).providers;
		expect(providers.anthropic.keyEnv).toBe('ANTHROPIC_API_KEY');
		expect(providers.openai.keyEnv).toBe('OPENAI_API_KEY');
		expect(providers['google-gemini'].keyEnv).toBe('GOOGLE_API_KEY');
		expect(providers.xai.keyEnv).toBe('XAI_API_KEY');
	});

	test('accepts provider model IDs containing a namespace', () => {
		expect(ModelRefSchema.parse('openrouter/meta-llama/llama-4-scout'))
			.toBe('openrouter/meta-llama/llama-4-scout');
	});
});

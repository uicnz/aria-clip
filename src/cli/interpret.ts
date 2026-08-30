import { complete, ProviderError } from '../core/interpreter/client.js';
import type { ProviderId } from '../schemas/model.js';
import { type Config, ModelRefSchema, type ModelRef, splitModel } from './config.js';
import { fail } from './fault.js';

const SYSTEM = 'Follow the supplied task exactly. Use only the supplied source context. Return only the requested finished Markdown artifact.';

export interface InterpretInput {
	prompt: string;
	context: string;
	model?: string;
	config: Config;
	timeout: number;
}

export interface Interpretation {
	markdown: string;
	provider: ProviderId;
	model: string;
}

export interface ModelChoice {
	provider: ProviderId;
	model: string;
}

export function resolveModel(model: string | undefined, config: Config): ModelChoice {
	const value = model
		?? config.defaultModel
		?? (config.models.length === 1 ? config.models[0] : undefined);
	if (!value) {
		fail('E_MODEL_NOT_CONFIGURED', 'This template requires an Interpreter model.', 'interpret', {
			hint: 'Pass `--model provider/model` or run `aria-clip models configure provider/model`.',
		});
	}
	const ref: ModelRef = ModelRefSchema.parse(value);
	const choice = splitModel(ref);
	const provider = config.providers[choice.provider];
	if (!provider) {
		fail('E_MODEL_NOT_CONFIGURED', `Provider ${choice.provider} is not configured.`, 'interpret', {
			hint: `Add ${choice.provider} under providers in the CLI config file.`,
		});
	}
	if (provider.keyEnv && !process.env[provider.keyEnv]) {
		fail('E_MODEL_NOT_CONFIGURED', `${provider.keyEnv} is not set.`, 'interpret', {
			hint: `Set ${provider.keyEnv} in the environment before running this command.`,
		});
	}
	return choice;
}

function source(prompt: string, context: string): string {
	return `<instructions>\n${prompt}\n</instructions>\n\n<context>\n${context}\n</context>`;
}

export async function interpret(input: InterpretInput): Promise<Interpretation> {
	const { provider: id, model } = resolveModel(input.model, input.config);
	const provider = input.config.providers[id];
	if (!provider) throw new Error(`Resolved provider ${id} is missing.`);

	try {
		const markdown = await complete({
			target: { api: provider.api, baseUrl: provider.baseUrl },
			model,
			key: provider.keyEnv ? process.env[provider.keyEnv] : undefined,
			system: SYSTEM,
			messages: [{ role: 'user', content: source(input.prompt, input.context) }],
			timeout: input.timeout,
		});
		return { markdown, provider: id, model };
	} catch (error) {
		if (error instanceof ProviderError) {
			fail('E_PROVIDER_FAILED', error.message, 'interpret', { retryable: error.retryable });
		}
		fail('E_PROVIDER_FAILED', error instanceof Error ? error.message : 'Interpreter request failed.', 'interpret');
	}
}

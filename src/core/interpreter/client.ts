import { z } from 'zod';
import { ApiSchema, type Api } from '../../schemas/model.js';

const JsonSchema = z.json();
type Json = z.infer<typeof JsonSchema>;

const MessageSchema = z.strictObject({
	role: z.enum(['system', 'user', 'assistant']),
	content: z.string(),
});

const ChatSchema = z.looseObject({
	choices: z.array(z.looseObject({
		finish_reason: z.string().nullish(),
		message: z.looseObject({ content: z.string() }),
	})).min(1),
});

const AnthropicSchema = z.looseObject({
	stop_reason: z.string().nullish(),
	content: z.array(z.looseObject({
		type: z.string(),
		text: z.string().optional(),
	})),
});

const GeminiSchema = z.looseObject({
	candidates: z.array(z.looseObject({
		finishReason: z.string().nullish(),
		content: z.looseObject({
			parts: z.array(z.looseObject({ text: z.string().optional() })),
		}),
	})).min(1),
});

const OllamaSchema = z.looseObject({
	done_reason: z.string().nullish(),
	message: z.looseObject({ content: z.string() }),
});

const TargetSchema = z.strictObject({
	api: ApiSchema.optional(),
	name: z.string().optional(),
	baseUrl: z.url(),
});

export type Message = z.infer<typeof MessageSchema>;
export type Target = z.infer<typeof TargetSchema>;

export interface CompletionInput {
	target: Target;
	model: string;
	key?: string;
	system: string;
	messages: Message[];
	json?: boolean;
	maxTokens?: number;
	timeout?: number;
}

export class ProviderError extends Error {
	readonly status?: number;
	readonly retryable: boolean;

	constructor(message: string, opts: { status?: number; retryable?: boolean } = {}) {
		super(message);
		this.name = 'ProviderError';
		this.status = opts.status;
		this.retryable = opts.retryable ?? false;
	}
}

export function apiFor(target: Target): Api {
	if (target.api) return target.api;
	const name = target.name?.toLowerCase() ?? '';
	const url = target.baseUrl.toLowerCase();
	if (name.includes('anthropic') || url.includes('api.anthropic.com')) return 'anthropic';
	if (url.includes('openai.azure.com')) return 'azure';
	if (name.includes('deepseek') || url.includes('api.deepseek.com')) return 'deepseek';
	if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
	if (name.includes('hugging') || url.includes('huggingface.co')) return 'huggingface';
	if (name.includes('ollama') || url.includes('127.0.0.1:11434') || url.includes('localhost:11434')) return 'ollama';
	if (name.includes('perplexity') || url.includes('api.perplexity.ai')) return 'perplexity';
	return 'openai';
}

function truncated(reason: string | null | undefined): boolean {
	return reason === 'max_tokens' || reason === 'length' || reason === 'MAX_TOKENS';
}

function auth(key?: string): Record<string, string> {
	return key ? { authorization: `Bearer ${key}` } : {};
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw new ProviderError(`Provider returned an unexpected response: ${z.prettifyError(result.error)}`);
	}
	return result.data;
}

async function post(url: string, body: Json, headers: HeadersInit, timeout?: number): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
			body: JSON.stringify(body),
			...(timeout ? { signal: AbortSignal.timeout(timeout) } : {}),
		});
	} catch (error) {
		throw new ProviderError(error instanceof Error ? error.message : 'Provider request failed.', { retryable: true });
	}

	if (!response.ok) {
		const detail = (await response.text()).slice(0, 500);
		throw new ProviderError(`Provider returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`, {
			status: response.status,
			retryable: response.status === 429 || response.status >= 500,
		});
	}

	try {
		return JSON.parse(await response.text());
	} catch {
		throw new ProviderError('Provider returned invalid JSON.');
	}
}

export async function complete(input: CompletionInput): Promise<string> {
	const target = TargetSchema.parse(input.target);
	const messages = z.array(MessageSchema).parse(input.messages);
	const api = apiFor(target);
	const max = input.maxTokens ?? 8_000;
	let url = target.baseUrl;
	let body: Json;
	let headers: HeadersInit = {};

	if (api === 'anthropic') {
		body = {
			model: input.model,
			system: input.system,
			messages: messages.filter(message => message.role !== 'system'),
			max_tokens: max,
		};
		headers = {
			'x-api-key': input.key ?? '',
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		};
	} else if (api === 'azure') {
		url = url.replace('{deployment-id}', input.model);
		body = {
			messages: [{ role: 'system', content: input.system }, ...messages],
			max_completion_tokens: max,
			stream: false,
		};
		headers = { 'api-key': input.key ?? '' };
	} else if (api === 'gemini') {
		url = url.replace('{model-id}', input.model);
		body = {
			systemInstruction: { parts: [{ text: input.system }] },
			contents: [{
				role: 'user',
				parts: messages.map(message => ({ text: message.content })),
			}],
			generationConfig: {
				maxOutputTokens: max,
				...(input.json ? { responseMimeType: 'application/json' } : {}),
			},
		};
		headers = { 'X-goog-api-key': input.key ?? '' };
	} else if (api === 'ollama') {
		body = {
			model: input.model,
			messages: [{ role: 'system', content: input.system }, ...messages],
			...(input.json ? { format: 'json' } : {}),
			num_ctx: 120_000,
			stream: false,
		};
	} else {
		if (api === 'huggingface') url = url.replace('{model-id}', input.model);
		body = {
			model: input.model,
			messages: [{ role: 'system', content: input.system }, ...messages],
			...(api === 'huggingface' ? { max_tokens: Math.min(max, 1_600) } : {}),
			...(api === 'deepseek' ? { max_tokens: max, thinking: { type: 'disabled' } } : {}),
			...(api === 'perplexity' ? { max_tokens: max } : {}),
			stream: false,
		};
		headers = {
			...auth(input.key),
			...(api === 'openai' || api === 'perplexity' ? {
				'HTTP-Referer': 'https://aria.bot/',
				'X-Title': 'Aria Clip',
			} : {}),
		};
	}

	let raw: unknown;
	try {
		raw = await post(url, body, headers, input.timeout);
	} catch (error) {
		if (api === 'ollama' && error instanceof ProviderError && error.status === 403) {
			throw new ProviderError('Ollama requires OLLAMA_ORIGINS to accept browser-extension requests. See https://docs.aria.bot/interpreter.', { status: 403 });
		}
		throw error;
	}

	let text = '';
	let reason: string | null | undefined;
	if (api === 'anthropic') {
		const result = parse(AnthropicSchema, raw);
		reason = result.stop_reason;
		text = result.content.find(block => block.type === 'text')?.text ?? '';
	} else if (api === 'gemini') {
		const result = parse(GeminiSchema, raw);
		reason = result.candidates[0].finishReason;
		text = result.candidates[0].content.parts.map(part => part.text ?? '').join('');
	} else if (api === 'ollama') {
		const result = parse(OllamaSchema, raw);
		reason = result.done_reason;
		text = result.message.content;
	} else {
		const result = parse(ChatSchema, raw);
		reason = result.choices[0].finish_reason;
		text = result.choices[0].message.content;
	}

	if (truncated(reason)) {
		throw new ProviderError('Provider response reached its output token limit. Try a shorter prompt or context.');
	}
	if (!text.trim()) throw new ProviderError('Provider returned no text.');
	return text.trim();
}

import { z } from 'zod';
import type { Template } from '../../../types/types.js';
import { applyFilters } from './filters/index.js';

export const PromptSchema = z.strictObject({
	key: z.string().regex(/^prompt_\d+$/),
	prompt: z.string().min(1),
	filters: z.string(),
});

export type Prompt = z.infer<typeof PromptSchema>;

const PATTERN = /{{(?:prompt:)?"([\s\S]*?)"(\|[\s\S]*?)?}}/g;

export function collectPrompts(template: Template): Prompt[] {
	const found = new Map<string, Prompt>();
	const texts = [
		template.noteNameFormat,
		template.noteContentFormat,
		...template.properties.map(property => property.value),
	];

	for (const text of texts) {
		for (const match of text.matchAll(PATTERN)) {
			const prompt = match[1];
			if (!prompt || found.has(prompt)) continue;
			found.set(prompt, PromptSchema.parse({
				key: `prompt_${found.size + 1}`,
				prompt,
				filters: match[2] ?? '',
			}));
		}
	}

	return [...found.values()];
}

export function replacePrompts(text: string, prompts: readonly Prompt[], responses: ReadonlyMap<string, string>, url = ''): string {
	return text.replace(PATTERN, (match, promptText: string, filters: string | undefined) => {
		const prompt = prompts.find(item => item.prompt === promptText);
		if (!prompt) return match;
		const response = responses.get(prompt.key);
		if (response === undefined) return match;
		return filters ? applyFilters(response, filters.slice(1), url) : response;
	});
}

export function replaceModel(text: string, provider: string, model: string): string {
	const values = { model, modelId: model, modelProvider: provider } as const;
	return text.replace(/{{(modelProvider|modelId|model)(\|[\s\S]*?)?}}/g, (_match, name: keyof typeof values, filters: string | undefined) => {
		const value = values[name];
		return filters ? applyFilters(value, filters.slice(1)) : value;
	});
}

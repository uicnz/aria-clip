// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import type { PromptVariable } from '../types/types.js';
import { replacePromptVariables, replacePromptVariablesInText } from './interpreter.js';

const promptVariables: PromptVariable[] = [
	{ key: 'prompt_1', prompt: 'Write a concise summary.' },
];

const promptResponses = [
	{ key: 'prompt_1', prompt: 'Write a concise summary.', user_response: 'The finished summary.' },
];

describe('Interpreter output separation', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	function addTextarea(id: string, value: string): HTMLTextAreaElement {
		const textarea = document.createElement('textarea');
		textarea.id = id;
		textarea.value = value;
		document.body.appendChild(textarea);
		return textarea;
	}

	test('renders an interpretation without changing the prompt', () => {
		const prompt = addTextarea('prompt-field', '{{"Write a concise summary."}}');
		const output = addTextarea('note-content-field', '');

		replacePromptVariables(promptVariables, promptResponses);
		output.value = replacePromptVariablesInText(prompt.value, promptVariables, promptResponses);

		expect(prompt.value).toBe('{{"Write a concise summary."}}');
		expect(output.value).toBe('The finished summary.');
	});

	test('continues replacing prompts used by other output fields', () => {
		const prompt = addTextarea('prompt-field', '{{"Write a concise summary."}}');
		const source = addTextarea('prompt-context', 'Source containing {{"Write a concise summary."}}');
		const property = addTextarea('summary', '{{"Write a concise summary."|upper}}');

		replacePromptVariables(promptVariables, promptResponses);

		expect(prompt.value).toBe('{{"Write a concise summary."}}');
		expect(source.value).toBe('Source containing {{"Write a concise summary."}}');
		expect(property.value).toBe('THE FINISHED SUMMARY.');
	});
});

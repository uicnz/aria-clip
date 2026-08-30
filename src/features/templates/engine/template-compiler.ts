// Template compiler for the Clip template engine
// This module provides the main entry point for template compilation,
// integrating the AST-based renderer with the variable processors.

import { render, RenderContext, AsyncResolver } from './renderer.js';
import { applyFilterDirect } from './filters/index.js';
import { processSimpleVariable } from './variables/simple.js';
import { processSchema } from './variables/schema.js';
import { processPrompt } from './variables/prompt.js';
import { isModelVariable, processModelVariable } from './variables/model.js';

/**
 * A function that processes a selector match string and returns the result.
 * Used to inject different selector implementations (browser vs CLI).
 */
export type SelectorProcessor = (match: string, currentUrl: string) => Promise<string>;

export interface CompileTemplateOptions {
	/** Keep prompt and model placeholders for a later Interpreter stage. */
	preserveInterpreterVariables?: boolean;
}

/**
 * Main function to compile a template with the given variables.
 *
 * @param tabId - Browser tab ID for selector resolution (0 if not applicable)
 * @param text - Template string to compile
 * @param variables - Variables available in the template
 * @param currentUrl - Current page URL for filter processing
 * @param customAsyncResolver - Optional environment-specific async resolver
 * @param customSelectorProcessor - Optional selector processor override for post-processing
 * @returns Compiled template string
 */
export async function compileTemplate(
	tabId: number,
	text: string,
	variables: { [key: string]: any },
	currentUrl: string,
	customAsyncResolver?: AsyncResolver,
	customSelectorProcessor?: SelectorProcessor,
	options: CompileTemplateOptions = {}
): Promise<string> {
	// Strip text fragment from URL
	currentUrl = currentUrl.replace(/#:~:text=[^&]+(&|$)/, '');

	// Create render context with custom variable resolver
	const context: RenderContext = {
		variables,
		currentUrl,
		tabId,
		applyFilterDirect,
		asyncResolver: customAsyncResolver,
	};

	// Render the template using the AST-based renderer
	const result = await render(text, context);

	// Log any errors (but don't fail - return partial output)
	if (result.errors.length > 0) {
		console.error('Template compilation errors:', result.errors.map(e => `Line ${e.line}: ${e.message}`).join('; '));
	}

	// Skip post-processing if no deferred variables were output
	// This optimization avoids regex-parsing the entire output when not needed
	if (!result.hasDeferredVariables) {
		return result.output;
	}

	// Post-process: handle special variable types that weren't processed by the renderer
	// The renderer handles basic variables, but special prefixes need custom processing
	const processedText = await processVariables(
		result.output,
		variables,
		currentUrl,
		customSelectorProcessor,
		options,
	);

	return processedText;
}

/**
 * Process variables and apply filters.
 * Handles special variable types: selector, schema, prompt.
 *
 * This is called after the AST-based renderer to handle any remaining
 * variable interpolations that need special processing.
 */
export async function processVariables(
	text: string,
	variables: { [key: string]: any },
	currentUrl: string,
	customSelectorProcessor?: SelectorProcessor,
	options: CompileTemplateOptions = {}
): Promise<string> {
	const regex = /{{([\s\S]*?)}}/g;
	let result = text;
	let match;

	while ((match = regex.exec(result)) !== null) {
		const fullMatch = match[0];
		const trimmedMatch = match[1].trim();

		let replacement: string;

		if (trimmedMatch.startsWith('selector:') || trimmedMatch.startsWith('selectorHtml:')) {
			if (customSelectorProcessor) {
				replacement = await customSelectorProcessor(fullMatch, currentUrl);
			} else {
				// Environment-independent compilation cannot query a browser tab.
				// Preserve the selector so a caller-specific stage can resolve it.
				replacement = fullMatch;
			}
		} else if (trimmedMatch.startsWith('schema:')) {
			replacement = await processSchema(fullMatch, variables, currentUrl);
		} else if (trimmedMatch.startsWith('"') || trimmedMatch.startsWith('prompt:')) {
			replacement = await processPrompt(fullMatch, options.preserveInterpreterVariables ?? false);
		} else if (isModelVariable(trimmedMatch)) {
			replacement = await processModelVariable(fullMatch, options.preserveInterpreterVariables ?? false);
		} else {
			replacement = await processSimpleVariable(trimmedMatch, variables, currentUrl);
		}

		result = result.substring(0, match.index) + replacement + result.substring(match.index + fullMatch.length);
		regex.lastIndex = match.index + replacement.length;
	}

	return result;
}

import { generalSettings } from '../../../platform/browser/storage-utils.js';
import { compileTemplate } from './template-compiler.js';
import { processSelector, resolveSelector } from './variables/selector.js';

/**
 * Browser adapter for the environment-independent template compiler.
 * Selector resolution and Interpreter visibility depend on browser state and
 * therefore belong outside the shared rendering core.
 */
export async function compileBrowserTemplate(
	tabId: number,
	template: string,
	variables: { [key: string]: any },
	currentUrl: string,
): Promise<string> {
	return compileTemplate(
		tabId,
		template,
		variables,
		currentUrl,
		async name => {
			if (name.startsWith('selector:') || name.startsWith('selectorHtml:')) {
				return resolveSelector(tabId, name);
			}
			return undefined;
		},
		(match, url) => processSelector(tabId, match, url),
		{ preserveInterpreterVariables: generalSettings.interpreterEnabled },
	);
}

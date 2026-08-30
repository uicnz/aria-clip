import { FilterFunction } from '../../../../types/types.js';
import { debugLog } from '../../../../shared/logging/debug.js';
import { createParserState, processCharacter } from '../parser-utils.js';

import { blockquote } from './blockquote.js';
import { calc, validateCalcParams } from './calc.js';
import { callout } from './callout.js';
import { camel } from './camel.js';
import { capitalize } from './capitalize.js';
import { date } from './date.js';
import { date_modify, validateDateModifyParams } from './date_modify.js';
import { decode_uri } from './decode_uri.js';
import { first } from './first.js';
import { footnote } from './footnote.js';
import { fragment_link } from './fragment_link.js';
import { html_to_json } from './html_to_json.js';
import { image } from './image.js';
import { join } from './join.js';
import { kebab } from './kebab.js';
import { last } from './last.js';
import { list, validateListParams } from './list.js';
import { link } from './link.js';
import { length } from './length.js';
import { lower } from './lower.js';
import { map, validateMapParams } from './map.js';
import { markdown } from './markdown.js';
import { merge } from './merge.js';
import { nth, validateNthParams } from './nth.js';
import { number_format } from './number_format.js';
import { object, validateObjectParams } from './object.js';
import { pascal } from './pascal.js';
import { reverse } from './reverse.js';
import { remove_attr } from './remove_attr.js';
import { remove_html } from './remove_html.js';
import { remove_tags } from './remove_tags.js';
import { replace, validateReplaceParams } from './replace.js';
import { replace_tags } from './replace_tags.js';
import { round, validateRoundParams } from './round.js';
import { safe_name, validateSafeNameParams } from './safe_name.js';
import { slice, validateSliceParams } from './slice.js';
import { snake } from './snake.js';
import { split } from './split.js';
import { strip_attr } from './strip_attr.js';
import { strip_md } from './strip_md.js';
import { strip_tags } from './strip_tags.js';
import { table } from './table.js';
import { template, validateTemplateParams } from './template.js';
import { title } from './title.js';
import { trim } from './trim.js';
import { uncamel } from './uncamel.js';
import { unescape } from './unescape.js';
import { unique } from './unique.js';
import { upper } from './upper.js';
import { wikilink } from './wikilink.js';
import { duration } from './duration.js';

// ============================================================================
// Filter Metadata for Validation
// ============================================================================

export interface ParamValidationResult {
	valid: boolean;
	error?: string;
}

export type ParamValidator = (param: string | undefined) => ParamValidationResult;

export interface FilterMetadata {
	example?: string;
	validateParams?: ParamValidator;
}

export const filterMetadata: Record<string, FilterMetadata> = {
	// Filters with validators
	calc: { example: 'calc:"+10"', validateParams: validateCalcParams },
	date_modify: { example: 'date_modify:"+1 day"', validateParams: validateDateModifyParams },
	map: { example: 'map:x => x.name', validateParams: validateMapParams },
	replace: { example: 'replace:"old":"new"', validateParams: validateReplaceParams },
	slice: { example: 'slice:0,5', validateParams: validateSliceParams },
	template: { example: 'template:"${name}"', validateParams: validateTemplateParams },

	// Filters with optional parameters (examples for documentation)
	blockquote: {},
	callout: { example: 'callout:info' },
	camel: {},
	capitalize: {},
	date: { example: 'date:"YYYY-MM-DD"' },
	decode_uri: {},
	duration: {},
	first: {},
	footnote: {},
	fragment_link: {},
	html_to_json: {},
	image: {},
	join: { example: 'join:", "' },
	kebab: {},
	last: {},
	length: {},
	link: {},
	list: { example: 'list:numbered', validateParams: validateListParams },
	lower: {},
	markdown: {},
	merge: {},
	nth: { example: 'nth:2', validateParams: validateNthParams },
	number_format: {},
	object: { example: 'object:keys', validateParams: validateObjectParams },
	pascal: {},
	remove_attr: {},
	remove_html: {},
	remove_tags: {},
	replace_tags: {},
	reverse: {},
	round: { example: 'round:2', validateParams: validateRoundParams },
	safe_name: { example: 'safe_name:windows', validateParams: validateSafeNameParams },
	snake: {},
	split: { example: 'split:","' },
	strip_attr: {},
	strip_md: {},
	strip_tags: {},
	stripmd: {},
	table: {},
	title: {},
	trim: {},
	uncamel: {},
	unescape: {},
	unique: {},
	upper: {},
	wikilink: {},
};

export const validFilterNames = new Set(Object.keys(filterMetadata));

export const filters: { [key: string]: FilterFunction } = {
	blockquote,
	calc,
	callout,
	camel,
	capitalize,
	date_modify,
	date,
	decode_uri,
	duration,
	first,
	footnote,
	fragment_link,
	html_to_json,
	image,
	join,
	kebab,
	last,
	length,
	link,
	list,
	lower,
	map,
	markdown,
	merge,
	number_format,
	nth,
	object,
	pascal,
	reverse,
	remove_attr,
	remove_html,
	remove_tags,
	replace,
	replace_tags,
	round,
	safe_name,
	slice,
	snake,
	split,
	strip_attr,
	strip_md,
	strip_tags,
	stripmd: strip_md, // an alias for strip_md
	table,
	template,
	title,
	trim,
	uncamel,
	unescape,
	unique,
	upper,
	wikilink
};

// Split individual filters
function splitFilterString(filterString: string): string[] {
	const filters: string[] = [];
	const state = createParserState();

	// Remove all spaces before and after | that are not within quotes or parentheses
	filterString = filterString.replace(/\s*\|\s*(?=(?:[^"'()]*["'][^"'()]*["'])*[^"'()]*$)/g, '|');

	// Iterate through each character in the filterString
	for (let i = 0; i < filterString.length; i++) {
		const char = filterString[i];

		// Split filters on pipe character when not in quotes, regex, or parentheses
		if (char === '|' && !state.inQuote && !state.inRegex && 
			state.curlyDepth === 0 && state.parenDepth === 0) {
			filters.push(state.current.trim());
			state.current = '';
		} else {
			// For any other character, add it to the current filter
			processCharacter(char, state);
		}
	}

	if (state.current) {
		filters.push(state.current.trim());
	}

	return filters;
}

// Parse the filter into name and parameters
function parseFilterString(filterString: string): string[] {
	const parts: string[] = [];
	const state = createParserState();

	// Iterate through each character in the filterString
	for (let i = 0; i < filterString.length; i++) {
		const char = filterString[i];

		if (char === ':' && !state.inQuote && !state.inRegex && 
			state.parenDepth === 0 && parts.length === 0) {
			parts.push(state.current.trim());
			state.current = '';
		} else {
			processCharacter(char, state);
		}
	}

	if (state.current) {
		parts.push(state.current.trim());
	}

	return parts;
}

/**
 * Apply a single filter by name with a pre-formatted parameter string.
 * Use this when you already have the filter name and parameters separated.
 * For filter strings like "filter1:arg|filter2", use applyFilters() instead.
 *
 * @param value - The input value to filter
 * @param filterName - The name of the filter to apply (e.g., "replace", "slice")
 * @param paramString - The parameter string without the filter name (e.g., "0,5" for slice:0,5)
 * @param currentUrl - Optional current URL for filters that need it
 * @returns The filtered value as a string
 */
export function applyFilterDirect(
	value: string | any[],
	filterName: string,
	paramString: string | undefined,
	currentUrl?: string
): string {
	debugLog('Filters', 'applyFilterDirect called with:', { value, filterName, paramString, currentUrl });

	const filter = filters[filterName];
	if (!filter) {
		console.error(`Invalid filter: ${filterName}`);
		debugLog('Filters', `Available filters:`, Object.keys(filters));
		return typeof value === 'string' ? value : JSON.stringify(value);
	}

	// Convert the input to a string if it's not already
	const stringInput = typeof value === 'string' ? value : JSON.stringify(value);

	// Build params array for special case handling
	let params = paramString ? [paramString] : [];

	// Special case for markdown filter: use currentUrl if no params provided
	if (filterName === 'markdown' && !paramString && currentUrl) {
		params = [currentUrl];
	}

	// Special case for fragment_link filter: append currentUrl
	if (filterName === 'fragment_link' && currentUrl) {
		params.push(currentUrl);
	}

	// Apply the filter
	const output = filter(stringInput, params.join(':'));

	debugLog('Filters', `Filter ${filterName} output:`, output);

	// If the output is a string that looks like JSON, try to parse it
	if (typeof output === 'string' && (output.startsWith('[') || output.startsWith('{'))) {
		try {
			const parsed = JSON.parse(output);
			return JSON.stringify(parsed);
		} catch {
			return output;
		}
	}

	return typeof output === 'string' ? output : JSON.stringify(output);
}

/**
 * Apply filters from a filter string (legacy path).
 * Used when filters are specified as a string like "filter1:arg|filter2".
 * For the optimized path with pre-parsed filters, use applyFilterDirect.
 */
export function applyFilters(value: string | any[], filterString: string, currentUrl?: string): string {
	debugLog('Filters', 'applyFilters called with:', { value, filterString, currentUrl });

	if (!filterString) {
		debugLog('Filters', 'Empty filter string, returning original value');
		return typeof value === 'string' ? value : JSON.stringify(value);
	}

	let processedValue = value;

	// Split the filter string into individual filter names, accounting for escaped pipes and quotes
	const filterNames = splitFilterString(filterString);
	debugLog('Filters', 'Split filter string:', filterNames);

	// Reduce through all filter names, applying each filter sequentially
	const result = filterNames.reduce((result, filterName) => {
			// Parse the filter string into name and parameters
			const [name, ...params] = parseFilterString(filterName);
			debugLog('Filters', `Parsed filter: ${name}, Params:`, params);

			// Get the filter function from the filters object
			const filter = filters[name];
			if (filter) {
				// Convert the input to a string if it's not already
				const stringInput = typeof result === 'string' ? result : JSON.stringify(result);

				// Special case for markdown filter: use currentUrl if no params provided
				if (name === 'markdown' && params.length === 0 && currentUrl) {
					params.push(currentUrl);
				}

				// Special case for fragment filter: use currentUrl if no params provided
				if (name === 'fragment_link' && currentUrl) {
					params.push(currentUrl);
				}

				// Apply the filter and get the output
				const output = filter(stringInput, params.join(':'));

				debugLog('Filters', `Filter ${name} output:`, output);

				// If the output is a string that looks like JSON, try to parse it
				if (typeof output === 'string' && (output.startsWith('[') || output.startsWith('{'))) {
					try {
						return JSON.parse(output);
					} catch {
						return output;
					}
				}
				return output;
			} else {
				// If the filter doesn't exist, log an error and return the unmodified result
				console.error(`Invalid filter: ${name}`);
				debugLog('Filters', `Available filters:`, Object.keys(filters));
				return result;
			}
		}, processedValue);

	// Ensure the final result is a string
	return typeof result === 'string' ? result : JSON.stringify(result);
}

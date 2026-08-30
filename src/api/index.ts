// Programmatic API for Aria Clip.
// Environment-agnostic — no Node.js or browser dependencies.
// The caller provides a DocumentParser for their environment.

import { extract } from '../core/clipping/defuddle.js';
import { createMarkdownContent } from 'defuddle/full';
import { compileTemplate, SelectorProcessor } from '../features/templates/engine/template-compiler.js';
import { AsyncResolver, RenderContext } from '../features/templates/engine/renderer.js';
import { applyFilters } from '../features/templates/engine/filters/index.js';
import { buildVariables, generateFrontmatter, extractContentBySelector, selectorContentToString, formatPropertyValue } from '../core/clipping/shared.js';
import { sanitizeFilename } from '../core/artifacts/filename.js';
import { normalizeMarkdownOutput } from '../core/markdown/markdown-output.js';
import { enrichPageMetadata } from '../core/clipping/metadata.js';
import type { Template, Property, ValueKind } from '../types/types.js';
import type { DefuddleResponse } from 'defuddle';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DocumentParser {
	parseFromString(html: string, mimeType: string): Document;
}

export interface ClipOptions {
	html: string;
	url: string;
	template: Template;
	documentParser: DocumentParser;
	propertyTypes?: Record<string, ValueKind>;
	/** Pre-parsed document to skip re-parsing (e.g. when already parsed for trigger matching). */
	parsedDocument?: Document;
	/** Pre-extracted source data when template matching already required Defuddle. */
	extracted?: DefuddleResponse;
	/** Keep prompt and model placeholders for a later Interpreter stage. */
	deferInterpreter?: boolean;
}

export interface ClipResult {
	noteName: string;
	frontmatter: string;
	content: string;
	fullContent: string;
	properties: Property[];
	variables: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Selector resolvers (work on any { querySelectorAll } document)
// ---------------------------------------------------------------------------

type DocLike = {
	querySelectorAll: (selector: string) => ArrayLike<Pick<Element, 'getAttribute' | 'outerHTML' | 'textContent'>>;
};

export function createAsyncResolver(doc: DocLike): AsyncResolver {
	return async (name: string, _context: RenderContext) => {
		if (name.startsWith('selector:') || name.startsWith('selectorHtml:')) {
			const extractHtml = name.startsWith('selectorHtml:');
			const prefix = extractHtml ? 'selectorHtml:' : 'selector:';
			const selectorPart = name.slice(prefix.length);

			const attrMatch = selectorPart.match(/^(.+?)\?(.+)$/);
			const selector = attrMatch ? attrMatch[1] : selectorPart;
			const attribute = attrMatch ? attrMatch[2] : undefined;

			return extractContentBySelector(
				doc,
				selector.replace(/\\"/g, '"'),
				attribute,
				extractHtml
			);
		}
		return undefined;
	};
}

export function createSelectorProcessor(doc: DocLike): SelectorProcessor {
	return async (match: string, currentUrl: string): Promise<string> => {
		const selectorRegex = /{{(selector|selectorHtml):(.*?)(?:\?(.*?))?(?:\|(.*?))?}}/;
		const matches = match.match(selectorRegex);
		if (!matches) return match;

		const [, selectorType, rawSelector, attribute, filtersString] = matches;
		const extractHtml = selectorType === 'selectorHtml';
		const selector = rawSelector.replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();

		const content = extractContentBySelector(doc, selector, attribute, extractHtml);
		const contentString = selectorContentToString(content);

		return filtersString ? applyFilters(contentString, filtersString, currentUrl) : contentString;
	};
}

// ---------------------------------------------------------------------------
// Core clipping function
// ---------------------------------------------------------------------------

/**
 * Clip a web page using the given template.
 *
 * The caller is responsible for:
 * - Fetching the HTML
 * - Providing a DocumentParser for their environment
 * - Writing the output (file, vault API, etc.)
 */
export async function clip(options: ClipOptions): Promise<ClipResult> {
	const { html, url, template, documentParser, propertyTypes, parsedDocument, extracted, deferInterpreter } = options;

	// Use pre-parsed document if provided, otherwise parse
	const doc = parsedDocument ?? documentParser.parseFromString(html, 'text/html');

	// Extract content with defuddle
	const defuddleResult = extracted ?? await extract(doc, { url });
	const pageMetadata = enrichPageMetadata(doc, url, {
		author: defuddleResult.author,
		published: defuddleResult.published,
		description: defuddleResult.description,
	});

	// Convert to markdown
	const markdownContent = createMarkdownContent(defuddleResult.content, url);

	// Build template variables
	const variables = buildVariables({
		title: defuddleResult.title,
		author: pageMetadata.author,
		content: markdownContent,
		contentHtml: defuddleResult.content,
		url,
		fullHtml: html,
		description: pageMetadata.description,
		favicon: defuddleResult.favicon,
		image: defuddleResult.image,
		published: pageMetadata.published,
		site: defuddleResult.site,
		language: defuddleResult.language,
		wordCount: defuddleResult.wordCount,
		schemaOrgData: defuddleResult.schemaOrgData,
		metaTags: defuddleResult.metaTags,
		extractedContent: defuddleResult.variables,
	});

	// Create resolvers for selector variables
	const asyncResolver = createAsyncResolver(doc);
	const selectorProcessor = createSelectorProcessor(doc);

	const compile = (text: string) =>
		compileTemplate(0, text, variables, url, asyncResolver, selectorProcessor, {
			preserveInterpreterVariables: deferInterpreter ?? false,
		});

	// Compile note name
	const compiledNoteName = await compile(template.noteNameFormat);
	const noteName = sanitizeFilename(compiledNoteName);

	// Compile and format each property
	const compiledProperties: Property[] = await Promise.all(
		template.properties.map(async (prop) => {
			let value = await compile(prop.value);
			const propType = prop.type || 'text';
			value = formatPropertyValue(value, propType, prop.value);
			return { name: prop.name, value, type: prop.type };
		})
	);

	// Build property type map
	const typeMap: Record<string, ValueKind> = {};
	for (const prop of template.properties) {
		if (prop.type) {
			typeMap[prop.name] = prop.type;
		}
	}
	if (propertyTypes) {
		Object.assign(typeMap, propertyTypes);
	}

	// Generate frontmatter
	const frontmatter = generateFrontmatter(compiledProperties, typeMap);

	// Compile note content
	const content = await compile(template.noteContentFormat);

	// Assemble full content
	const fullContent = normalizeMarkdownOutput(frontmatter ? frontmatter + content : content);

	return {
		noteName,
		frontmatter,
		content,
		fullContent,
		properties: compiledProperties,
		variables,
	};
}

// Re-export types that consumers may need
export type { Template, Property } from '../types/types.js';
export { matchTemplate } from '../features/templates/engine/triggers.js';

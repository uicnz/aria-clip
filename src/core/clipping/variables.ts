import dayjs from 'dayjs';
import { sanitizeFilename } from '../artifacts/filename.js';
import { getDomain } from '../../shared/text/string-utils.js';

export type TemplateVariableOrigin = 'page' | 'computed' | 'extracted' | 'meta' | 'schema' | 'interpreter';
export type TemplateVariableKind = 'text' | 'number' | 'boolean' | 'date' | 'url' | 'markdown' | 'html' | 'list' | 'json';

export interface CanonicalVariableDefinition {
	name: string;
	kind: TemplateVariableKind;
	origin: Exclude<TemplateVariableOrigin, 'extracted' | 'meta' | 'schema'>;
	large?: boolean;
}

export interface TemplateVariableDescriptor {
	name: string;
	variable: string;
	value: string;
	kind: TemplateVariableKind;
	origin: TemplateVariableOrigin;
	canonical: boolean;
	inspectable: boolean;
	large: boolean;
	source?: string;
	schemaType?: string;
	schemaPath?: string;
}

export interface TemplateVariableCatalog {
	entries: TemplateVariableDescriptor[];
	values: Record<string, string>;
}

export interface BuildVariablesParams {
	title: string;
	author: string;
	content: string;
	contentHtml: string;
	url: string;
	fullHtml: string;
	description: string;
	favicon: string;
	image: string;
	published: string;
	site: string;
	language: string;
	wordCount: number;
	selection?: string;
	selectionHtml?: string;
	highlights?: string;
	schemaOrgData?: unknown;
	metaTags?: { name?: string | null; property?: string | null; content: string | null }[];
	extractedContent?: Record<string, string>;
}

export const CANONICAL_VARIABLE_DEFINITIONS: readonly CanonicalVariableDefinition[] = [
	{ name: 'author', kind: 'text', origin: 'page' },
	{ name: 'content', kind: 'markdown', origin: 'page', large: true },
	{ name: 'contentHtml', kind: 'html', origin: 'page', large: true },
	{ name: 'selection', kind: 'markdown', origin: 'page' },
	{ name: 'selectionHtml', kind: 'html', origin: 'page' },
	{ name: 'date', kind: 'date', origin: 'computed' },
	{ name: 'time', kind: 'date', origin: 'computed' },
	{ name: 'description', kind: 'text', origin: 'page' },
	{ name: 'domain', kind: 'text', origin: 'computed' },
	{ name: 'favicon', kind: 'url', origin: 'page' },
	{ name: 'fullHtml', kind: 'html', origin: 'page', large: true },
	{ name: 'highlights', kind: 'json', origin: 'page' },
	{ name: 'image', kind: 'url', origin: 'page' },
	{ name: 'noteName', kind: 'text', origin: 'computed' },
	{ name: 'published', kind: 'date', origin: 'page' },
	{ name: 'site', kind: 'text', origin: 'page' },
	{ name: 'title', kind: 'text', origin: 'page' },
	{ name: 'url', kind: 'url', origin: 'page' },
	{ name: 'language', kind: 'text', origin: 'page' },
	{ name: 'words', kind: 'number', origin: 'computed' },
	{ name: 'transcript', kind: 'markdown', origin: 'page', large: true },
	{ name: 'model', kind: 'text', origin: 'interpreter' },
	{ name: 'modelId', kind: 'text', origin: 'interpreter' },
	{ name: 'modelProvider', kind: 'text', origin: 'interpreter' },
] as const;

export const CANONICAL_VARIABLE_NAMES = new Set(CANONICAL_VARIABLE_DEFINITIONS.map(definition => definition.name));
export const DYNAMIC_VARIABLE_PREFIXES = ['schema:', 'selector:', 'selectorHtml:', 'meta:'] as const;

const definitionByName = new Map(CANONICAL_VARIABLE_DEFINITIONS.map(definition => [definition.name, definition]));
const hiddenFromInspector = new Set(['content', 'contentHtml', 'fullHtml']);
const primarySchemaTypes = new Set([
	'Article', 'NewsArticle', 'BlogPosting', 'WebPage', 'VideoObject', 'Recipe', 'Product', 'Event', 'Person',
]);

function variableToken(name: string): string {
	return `{{${name}}}`;
}

function firstNonEmpty(...values: unknown[]): string {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value.trim();
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	}
	return '';
}

function schemaTypes(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
	return [];
}

function topLevelSchemaObjects(schemaData: unknown): Record<string, unknown>[] {
	if (Array.isArray(schemaData)) {
		return schemaData.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item));
	}
	if (schemaData !== null && typeof schemaData === 'object') return [schemaData as Record<string, unknown>];
	return [];
}

function primarySchemaObject(schemaData: unknown): Record<string, unknown> | undefined {
	const objects = topLevelSchemaObjects(schemaData);
	return objects.find(object => schemaTypes(object['@type']).some(type => primarySchemaTypes.has(type))) ?? objects[0];
}

function textFromPerson(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (Array.isArray(value)) return value.map(textFromPerson).filter(Boolean).join(', ');
	if (value !== null && typeof value === 'object') {
		const object = value as Record<string, unknown>;
		return firstNonEmpty(object.name, object.headline);
	}
	return '';
}

function textFromImage(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const image = textFromImage(item);
			if (image) return image;
		}
	}
	if (value !== null && typeof value === 'object') {
		const object = value as Record<string, unknown>;
		return firstNonEmpty(object.url, object.contentUrl, object.thumbnailUrl);
	}
	return '';
}

function metaValue(params: BuildVariablesParams, ...keys: string[]): string {
	const wanted = new Set(keys.map(key => key.toLowerCase()));
	for (const tag of params.metaTags ?? []) {
		const names = [tag.name && `name:${tag.name}`, tag.property && `property:${tag.property}`]
			.filter((key): key is string => Boolean(key))
			.map(key => key.toLowerCase());
		if (names.some(name => wanted.has(name)) && tag.content?.trim()) return tag.content.trim();
	}
	return '';
}

function publishedValue(...values: unknown[]): string {
	for (const value of values) {
		if (typeof value !== 'string') continue;
		const raw = value.trim();
		if (!raw) continue;
		const match = raw.match(
			/\b\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/i,
		);
		if (match) return match[0];
	}
	return '';
}

function canonicalValues(params: BuildVariablesParams): Record<string, string> {
	const schema = primarySchemaObject(params.schemaOrgData);
	const publisher = schema?.publisher;
	const publisherName = publisher !== null && typeof publisher === 'object'
		? firstNonEmpty((publisher as Record<string, unknown>).name)
		: firstNonEmpty(publisher);
	const currentUrl = params.url.replace(/#:~:text=[^&]+(&|$)/, '');
	const timestamp = dayjs().format('YYYY-MM-DDTHH:mm:ssZ');

	return {
		author: firstNonEmpty(
			params.author,
			textFromPerson(schema?.author),
			metaValue(params, 'name:author', 'property:article:author'),
		),
		content: (params.content || '').trim(),
		contentHtml: (params.contentHtml || '').trim(),
		selection: (params.selection || '').trim(),
		selectionHtml: (params.selectionHtml || '').trim(),
		date: timestamp,
		time: timestamp,
		description: firstNonEmpty(
			params.description,
			schema?.description,
			metaValue(params, 'name:description', 'property:og:description', 'name:twitter:description'),
		),
		domain: getDomain(currentUrl),
		favicon: params.favicon || '',
		fullHtml: (params.fullHtml || '').trim(),
		highlights: params.highlights || '',
		image: firstNonEmpty(
			params.image,
			textFromImage(schema?.image),
			metaValue(params, 'property:og:image', 'name:twitter:image'),
		),
		noteName: sanitizeFilename(firstNonEmpty(params.title, schema?.headline, schema?.name, 'untitled')).trim(),
		published: publishedValue(
			params.published,
			schema?.datePublished,
			schema?.uploadDate,
			schema?.startDate,
			metaValue(params, 'property:article:published_time', 'name:date', 'name:pubdate'),
		),
		site: firstNonEmpty(params.site, publisherName, metaValue(params, 'property:og:site_name')),
		title: firstNonEmpty(params.title, schema?.headline, schema?.name, metaValue(params, 'property:og:title', 'name:twitter:title')),
		url: currentUrl.trim(),
		language: firstNonEmpty(params.language, schema?.inLanguage, metaValue(params, 'property:og:locale')),
		words: String(params.wordCount ?? 0),
	};
}

function inferKind(value: unknown, name = ''): TemplateVariableKind {
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (Array.isArray(value)) return 'list';
	if (value !== null && typeof value === 'object') return 'json';
	if (/^(?:https?:)?\/\//i.test(String(value)) || /(?:url|image|favicon)$/i.test(name)) return 'url';
	if (/(?:date|published|modified|created|upload)/i.test(name)) return 'date';
	return 'text';
}

function schemaIdentity(prefix: string): { schemaType?: string; schemaPath: string } {
	const match = prefix.match(/^(@[^:]+):?(.*)$/);
	if (!match) return { schemaPath: prefix.replace(/\.$/, '') };
	return {
		schemaType: match[1],
		schemaPath: match[2].replace(/^[:.]/, '').replace(/\.$/, ''),
	};
}

export function buildVariableCatalog(params: BuildVariablesParams): TemplateVariableCatalog {
	const entries = new Map<string, TemplateVariableDescriptor>();

	const add = (
		name: string,
		value: unknown,
		options: Partial<Omit<TemplateVariableDescriptor, 'name' | 'variable' | 'value'>> = {},
	): void => {
		const definition = definitionByName.get(name);
		const variable = variableToken(name);
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
		entries.set(variable, {
			name,
			variable,
			value: stringValue,
			kind: options.kind ?? definition?.kind ?? inferKind(value, name),
			origin: options.origin ?? definition?.origin ?? 'extracted',
			canonical: options.canonical ?? Boolean(definition),
			inspectable: options.inspectable ?? !hiddenFromInspector.has(name),
			large: options.large ?? Boolean(definition?.large),
			source: options.source,
			schemaType: options.schemaType,
			schemaPath: options.schemaPath,
		});
	};

	for (const [name, value] of Object.entries(canonicalValues(params))) add(name, value);

	for (const [name, value] of Object.entries(params.extractedContent ?? {})) {
		add(name, value, { origin: 'extracted', large: definitionByName.get(name)?.large ?? value.length > 4000 });
	}

	for (const meta of params.metaTags ?? []) {
		if (meta.name && meta.content) add(`meta:name:${meta.name}`, meta.content, { origin: 'meta', source: meta.name });
		if (meta.property && meta.content) add(`meta:property:${meta.property}`, meta.content, { origin: 'meta', source: meta.property });
	}

	const addSchema = (schemaData: unknown, prefix = ''): void => {
		if (Array.isArray(schemaData)) {
			schemaData.forEach((item, index) => {
				if (!item || typeof item !== 'object') return;
				const types = schemaTypes((item as Record<string, unknown>)['@type']);
				if (types.length > 0) types.forEach(type => addSchema(item, `@${type}:`));
				else addSchema(item, `[${index}]:`);
			});
			return;
		}

		if (schemaData === null || typeof schemaData !== 'object') return;
		const object = schemaData as Record<string, unknown>;
		const containerName = `schema:${prefix.replace(/\.$/, '')}`;
		const containerIdentity = schemaIdentity(prefix);
		add(containerName, object, {
			origin: 'schema',
			kind: 'json',
			inspectable: false,
			schemaType: containerIdentity.schemaType,
			schemaPath: containerIdentity.schemaPath,
		});

		for (const [key, value] of Object.entries(object)) {
			if (key === '@type') continue;
			const name = `schema:${prefix}${key}`;
			const identity = schemaIdentity(`${prefix}${key}`);
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				add(name, value, { origin: 'schema', schemaType: identity.schemaType, schemaPath: identity.schemaPath });
			} else if (Array.isArray(value)) {
				const containsObjects = value.some(item => item !== null && typeof item === 'object');
				add(name, value, {
					origin: 'schema',
					kind: 'list',
					inspectable: !containsObjects,
					schemaType: identity.schemaType,
					schemaPath: identity.schemaPath,
				});
				value.forEach((item, index) => addSchema(item, `${prefix}${key}[${index}].`));
			} else if (value !== null && typeof value === 'object') {
				addSchema(value, `${prefix}${key}.`);
			}
		}
	};

	if (params.schemaOrgData) addSchema(params.schemaOrgData);

	const catalogEntries = [...entries.values()];
	return {
		entries: catalogEntries,
		values: Object.fromEntries(catalogEntries.map(entry => [entry.variable, entry.value])),
	};
}

export function buildVariables(params: BuildVariablesParams): Record<string, string> {
	return buildVariableCatalog(params).values;
}

export function addSchemaOrgDataToVariables(schemaData: unknown, variables: Record<string, string>, prefix = ''): void {
	const catalog = buildVariableCatalog({
		title: '', author: '', content: '', contentHtml: '', url: '', fullHtml: '', description: '', favicon: '', image: '',
		published: '', site: '', language: '', wordCount: 0, schemaOrgData: prefix ? undefined : schemaData,
	});
	if (!prefix) {
		for (const entry of catalog.entries) {
			if (entry.origin === 'schema') variables[entry.variable] = entry.value;
		}
		return;
	}

	// Preserve the legacy recursive-prefix API for callers that provide one.
	const addPrefixed = (value: unknown, currentPrefix: string): void => {
		if (Array.isArray(value)) {
			value.forEach((item, index) => addPrefixed(item, `${currentPrefix}[${index}].`));
			return;
		}
		if (value === null || typeof value !== 'object') return;
		variables[variableToken(`schema:${currentPrefix.replace(/\.$/, '')}`)] = JSON.stringify(value);
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (key === '@type') continue;
			const token = variableToken(`schema:${currentPrefix}${key}`);
			if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') variables[token] = String(child);
			else if (Array.isArray(child)) {
				variables[token] = JSON.stringify(child);
				child.forEach((item, index) => addPrefixed(item, `${currentPrefix}${key}[${index}].`));
			} else addPrefixed(child, `${currentPrefix}${key}.`);
		}
	};
	addPrefixed(schemaData, prefix);
}

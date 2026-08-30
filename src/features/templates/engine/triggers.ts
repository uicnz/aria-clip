import type { Template } from '../../../types/types.js';

let templates: readonly Template[] = [];

function object(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function schemas(value: unknown): unknown[] {
	if (!Array.isArray(value)) return [value];
	return value.flatMap(item => Array.isArray(item) ? item : [item]);
}

function nested(value: unknown, path: string): unknown {
	let current = value;
	for (const key of path.split('.')) {
		if (!object(current) || !(key in current)) return undefined;
		current = current[key];
	}
	return current;
}

function matchSchema(pattern: string, data: unknown): boolean {
	const parsed = pattern.match(/^schema:(@\w+)?(?:\.(.+?))?(?:=(.+))?$/);
	if (!parsed) return false;
	const [, schemaType, schemaKey, expected] = parsed;
	if (!schemaType && !schemaKey) return false;

	for (const schema of schemas(data)) {
		if (!object(schema)) continue;
		if (schemaType) {
			const raw = schema['@type'];
			const types = Array.isArray(raw) ? raw : [raw];
			if (!types.includes(schemaType.slice(1))) continue;
		}
		if (!schemaKey) return true;
		const actual = nested(schema, schemaKey);
		if (expected === undefined) {
			if (actual !== undefined) return true;
		} else if (Array.isArray(actual) ? actual.includes(expected) : actual === expected) {
			return true;
		}
	}

	return false;
}

function matchRegex(pattern: string, url: string): boolean {
	try {
		return new RegExp(pattern.slice(1, -1)).test(url);
	} catch {
		return false;
	}
}

export function matchPattern(pattern: string, url: string, data?: unknown): boolean {
	if (pattern.startsWith('schema:')) return matchSchema(pattern, data);
	if (pattern.startsWith('/') && pattern.endsWith('/')) return matchRegex(pattern, url);
	return url.startsWith(pattern);
}

export function matchTemplate(items: readonly Template[], url: string, data?: unknown): Template | undefined {
	let prefix: { template: Template; length: number } | undefined;
	for (const template of items) {
		for (const trigger of template.triggers ?? []) {
			if (trigger.startsWith('schema:') || (trigger.startsWith('/') && trigger.endsWith('/'))) continue;
			if (url.startsWith(trigger) && (!prefix || trigger.length > prefix.length)) {
				prefix = { template, length: trigger.length };
			}
		}
	}
	if (prefix) return prefix.template;

	for (const template of items) {
		if ((template.triggers ?? []).some(trigger =>
			trigger.startsWith('/') && trigger.endsWith('/') && matchRegex(trigger, url)
		)) return template;
	}

	if (data !== undefined) {
		for (const template of items) {
			if ((template.triggers ?? []).some(trigger => trigger.startsWith('schema:') && matchSchema(trigger, data))) {
				return template;
			}
		}
	}

	return undefined;
}

export function initializeTriggers(items: readonly Template[]): void {
	templates = items;
}

async function find(url: string, getSchema: () => Promise<unknown>): Promise<Template | undefined> {
	const byUrl = matchTemplate(templates, url);
	if (byUrl) return byUrl;
	const needsSchema = templates.some(template =>
		(template.triggers ?? []).some(trigger => trigger.startsWith('schema:'))
	);
	return needsSchema ? matchTemplate(templates, url, await getSchema()) : undefined;
}

export const findMatchingTemplate = Object.assign(find, { clear: (): void => undefined });

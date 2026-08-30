// Shared pure functions used by both the browser extension and CLI.
// This module must NOT import any browser-specific APIs (webextension-polyfill,
// storage-utils, browser globals). All browser-dependent behavior is injected
// via parameters.

import { escapeDoubleQuotes } from '../../shared/text/string-utils.js';
import { Property } from '../../types/types.js';
import dayjs from 'dayjs';

export {
	addSchemaOrgDataToVariables,
	buildVariableCatalog,
	buildVariables,
} from './variables.js';
export type {
	BuildVariablesParams,
	CanonicalVariableDefinition,
	TemplateVariableCatalog,
	TemplateVariableDescriptor,
	TemplateVariableKind,
	TemplateVariableOrigin,
} from './variables.js';

// ---------------------------------------------------------------------------
// Frontmatter generation
// ---------------------------------------------------------------------------

/**
 * Generate YAML frontmatter from compiled properties.
 * Property types are passed in as a map rather than read from browser storage.
 */
export function generateFrontmatter(
	properties: Property[],
	propertyTypes: Record<string, string> = {}
): string {
	let frontmatter = '---\n';
	for (const property of properties) {
		const trimmedName = property.name.trim();
		const needsQuotes = /[:\s\{\}\[\],&*#?|<>=!%@\\-]/.test(trimmedName)
			|| /^\d/.test(trimmedName)
			|| /^(true|false|null|yes|no|on|off)$/i.test(trimmedName);
		const propertyKey = needsQuotes
			? (property.name.includes('"')
				? `'${property.name.replace(/'/g, "''")}'`
				: `"${property.name}"`)
			: property.name;
		frontmatter += `${propertyKey}:`;

		const propertyType = propertyTypes[property.name] || 'text';

		switch (propertyType) {
			case 'multitext': {
				let items: string[];
				if (property.value.trim().startsWith('["') && property.value.trim().endsWith('"]')) {
					try {
						items = JSON.parse(property.value);
					} catch {
						items = property.value.split(',').map(item => item.trim());
					}
				} else {
					items = property.value.split(/,(?![^\[]*\]\])/).map(item => item.trim());
				}
				items = items.filter(item => item !== '');
				if (items.length > 0) {
					frontmatter += '\n';
					items.forEach(item => {
						frontmatter += `  - "${escapeDoubleQuotes(item)}"\n`;
					});
				} else {
					frontmatter += '\n';
				}
				break;
			}
			case 'number': {
				const numericValue = property.value.replace(/[^\d.-]/g, '');
				frontmatter += numericValue ? ` ${parseFloat(numericValue)}\n` : '\n';
				break;
			}
			case 'checkbox': {
				const isChecked = typeof property.value === 'boolean' ? property.value : property.value === 'true';
				frontmatter += ` ${isChecked}\n`;
				break;
			}
			case 'date':
			case 'datetime':
				frontmatter += property.value.trim() !== '' ? ` ${property.value}\n` : '\n';
				break;
			default:
				frontmatter += property.value.trim() !== '' ? ` "${escapeDoubleQuotes(property.value)}"\n` : '\n';
		}
	}
	frontmatter += '---\n';

	if (frontmatter.trim() === '---\n---') {
		return '';
	}

	return frontmatter;
}

// ---------------------------------------------------------------------------
// Property type formatting
// ---------------------------------------------------------------------------

/**
 * Apply type-aware formatting to a compiled property value.
 * Shared by CLI, API, and browser extension.
 *
 * @param value - The compiled template value
 * @param type - Property type (text, number, checkbox, date, datetime, multitext)
 * @param templateValue - The raw template string (used to check for existing |date: filters)
 */
export function formatPropertyValue(value: string, type: string, templateValue: string): string {
	switch (type) {
		case 'number': {
			const numericValue = value.replace(/[^\d.-]/g, '');
			return numericValue ? parseFloat(numericValue).toString() : value;
		}
		case 'checkbox':
			return (value.toLowerCase() === 'true' || value === '1').toString();
		case 'date':
		case 'datetime': {
			if (!templateValue.includes('|date:')) {
				const d = dayjs(value);
				if (d.isValid()) {
					return d.format(type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ssZ');
				}
			}
			return value;
		}
		default:
			return value;
	}
}

// ---------------------------------------------------------------------------
// CSS selector content extraction
// ---------------------------------------------------------------------------

/**
 * Extract content from a document using a CSS selector.
 * Works with any document-like object (browser Document, linkedom, etc.).
 */
export function extractContentBySelector(
	doc: { querySelectorAll: (selector: string) => any },
	selector: string,
	attribute?: string,
	extractHtml: boolean = false
): string | string[] {
	try {
		const elements = doc.querySelectorAll(selector);

		if (elements.length === 0) {
			return '';
		}

		return Array.from(elements).map((el: any) => {
			if (attribute) {
				return el.getAttribute(attribute) || '';
			}
			return extractHtml ? el.outerHTML : el.textContent?.trim() || '';
		});
	} catch (error) {
		console.error('Error in extractContentBySelector:', error);
		return '';
	}
}

/**
 * Convert selector content (string or string[]) to a display string.
 * Single-element arrays are unwrapped to a plain string.
 */
export function selectorContentToString(content: string | string[]): string {
	if (Array.isArray(content)) {
		return content.length === 1 ? String(content[0]) : JSON.stringify(content);
	}
	return content;
}

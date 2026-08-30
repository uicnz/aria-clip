import { formatMarkdownImage } from '../markdown-output.js';

export const image = (str: string, param?: string): string | string[] => {
	if (!str.trim()) {
		return str;
	}

	let altText = '';
	if (param) {
		// Remove outer parentheses if present
		param = param.replace(/^\((.*)\)$/, '$1');
		// Remove surrounding quotes (both single and double)
		altText = param.replace(/^(['"])([\s\S]*)\1$/, '$2');
	}

	try {
		const data = JSON.parse(str);
		
		const processObject = (obj: any): string[] => {
			return Object.entries(obj).map(([key, value]) => {
				if (typeof value === 'object' && value !== null) {
					return processObject(value);
				}
				return formatMarkdownImage(key, String(value));
			}).flat();
		};

		if (Array.isArray(data)) {
			return data.map(item => {
				if (typeof item === 'object' && item !== null) {
					return processObject(item);
				}
				return item ? formatMarkdownImage(String(item), altText) : '';
			}).flat();
		} else if (typeof data === 'object' && data !== null) {
			return processObject(data);
		}
	} catch (error) {
		// If parsing fails, treat it as a single URL string
		return formatMarkdownImage(str, altText);
	}

	return str;
};

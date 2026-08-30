function imageAltFallback(destination: string): string {
	const value = destination.replace(/^<|>$/g, '').trim();
	const dataType = value.match(/^data:image\/([a-z0-9.+-]+)/i)?.[1];
	if (dataType) return dataType.split('+')[0].toLowerCase();

	let pathname = value.split(/[?#]/, 1)[0];
	try {
		pathname = new URL(value, 'https://aria.invalid').pathname;
	} catch {
		// Relative paths are handled by the string fallback above.
	}

	const extension = pathname.match(/\.([a-z0-9]{1,10})$/i)?.[1];
	return extension?.toLowerCase() || 'image';
}

function escapeAltText(value: string): string {
	return value.replace(/([\\\]])/g, '\\$1');
}

function angleDestination(value: string): string {
	const destination = value.replace(/^<|>$/g, '').trim();
	return `<${destination.replace(/</g, '%3C').replace(/>/g, '%3E')}>`;
}

export function formatMarkdownImage(destination: string, altText = ''): string {
	const alt = altText.trim() || imageAltFallback(destination);
	return `![${escapeAltText(alt)}](${angleDestination(destination)})`;
}

type InlineDestination = {
	destination: string;
	title: string;
};

function splitInlineDestination(value: string): InlineDestination | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	if (trimmed.startsWith('<')) {
		const end = trimmed.indexOf('>');
		if (end > 0) {
			return {
				destination: trimmed.slice(1, end),
				title: trimmed.slice(end + 1),
			};
		}
	}

	const titleMatch = trimmed.match(/^([\s\S]*?)(\s+(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\((?:\\.|[^)])*\)))$/);
	return {
		destination: titleMatch ? titleMatch[1] : trimmed,
		title: titleMatch ? titleMatch[2] : '',
	};
}

function findClosingParenthesis(value: string, start: number): number {
	let depth = 1;
	for (let index = start + 1; index < value.length; index++) {
		if (value[index] === '\\') {
			index++;
			continue;
		}
		if (value[index] === '(') depth++;
		if (value[index] === ')') {
			depth--;
			if (depth === 0) return index;
		}
	}
	return -1;
}

function normalizeInlineLinks(value: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < value.length) {
		const imageStart = value.indexOf('![', cursor);
		const linkStart = value.indexOf('[', cursor);
		let start = -1;
		let image = false;

		if (imageStart >= 0 && (linkStart < 0 || imageStart <= linkStart)) {
			start = imageStart;
			image = true;
		} else if (linkStart >= 0) {
			start = linkStart;
		}

		if (start < 0) {
			result += value.slice(cursor);
			break;
		}

		const labelStart = start + (image ? 2 : 1);
		const labelEnd = value.indexOf(']', labelStart);
		const destinationStart = labelEnd >= 0 ? labelEnd + 1 : -1;
		if (labelEnd < 0 || value[destinationStart] !== '(') {
			result += value.slice(cursor, labelStart);
			cursor = labelStart;
			continue;
		}

		const destinationEnd = findClosingParenthesis(value, destinationStart);
		if (destinationEnd < 0) {
			result += value.slice(cursor);
			break;
		}

		const parsed = splitInlineDestination(value.slice(destinationStart + 1, destinationEnd));
		if (!parsed) {
			result += value.slice(cursor, destinationEnd + 1);
			cursor = destinationEnd + 1;
			continue;
		}

		const label = value.slice(labelStart, labelEnd);
		const normalizedLabel = image && !label.trim()
			? imageAltFallback(parsed.destination)
			: label;
		result += value.slice(cursor, start);
		result += `${image ? '!' : ''}[${normalizedLabel}](${angleDestination(parsed.destination)}${parsed.title})`;
		cursor = destinationEnd + 1;
	}

	return result;
}

function isInsideMarkdownLabel(value: string, index: number): boolean {
	return value.lastIndexOf('[', index) > value.lastIndexOf(']', index);
}

function isInsideHtmlTag(value: string, index: number): boolean {
	return value.lastIndexOf('<', index) > value.lastIndexOf('>', index);
}

function trimUrlPunctuation(value: string): { url: string; suffix: string } {
	let url = value;
	let suffix = '';

	while (/[.,;:!]$/.test(url)) {
		suffix = url.slice(-1) + suffix;
		url = url.slice(0, -1);
	}

	const pairs: Array<[string, string]> = [['(', ')'], ['[', ']'], ['{', '}']];
	for (const [open, close] of pairs) {
		while (url.endsWith(close) && url.split(close).length > url.split(open).length) {
			suffix = close + suffix;
			url = url.slice(0, -1);
		}
	}

	return { url, suffix };
}

function wrapBareUrls(value: string): string {
	return value.replace(/(?:https?|ftp):\/\/[^\s<>"']+/gi, (match, offset: number) => {
		const previous = value[offset - 1] || '';
		if (previous === '<' || previous === '"' || previous === "'") return match;
		if (isInsideMarkdownLabel(value, offset) || isInsideHtmlTag(value, offset)) return match;

		const { url, suffix } = trimUrlPunctuation(match);
		return `<${url}>${suffix}`;
	});
}

function normalizeHtmlImages(value: string): string {
	return value.replace(/<img\b([^>]*?)>/gi, (tag, attributes: string) => {
		const source = attributes.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
		const destination = source?.[1] || source?.[2] || source?.[3] || '';
		const fallback = imageAltFallback(destination);
		const alt = attributes.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);

		if (!alt) return tag.replace(/>$/, ` alt="${fallback}">`);
		if ((alt[1] || alt[2] || alt[3] || '').trim()) return tag;

		return tag.replace(/\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `alt="${fallback}"`);
	});
}

function transformOutsideInlineCode(value: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < value.length) {
		const opening = value.indexOf('`', cursor);
		if (opening < 0) {
			const prose = value.slice(cursor);
			result += wrapBareUrls(normalizeHtmlImages(normalizeInlineLinks(prose)));
			break;
		}

		const run = value.slice(opening).match(/^`+/)?.[0] || '`';
		const closing = value.indexOf(run, opening + run.length);
		const prose = value.slice(cursor, opening);
		result += wrapBareUrls(normalizeHtmlImages(normalizeInlineLinks(prose)));
		if (closing < 0) {
			result += value.slice(opening);
			break;
		}

		result += value.slice(opening, closing + run.length);
		cursor = closing + run.length;
	}

	return result;
}

/** Normalize generated Markdown immediately before it leaves Aria Clip. */
export function normalizeMarkdownOutput(markdown: string): string {
	const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
	let inFrontmatter = lines[0]?.trim() === '---';
	let inFence = false;
	let fenceMarker = '';

	const normalized = lines.map((line, index) => {
		if (inFrontmatter) {
			if (index > 0 && line.trim() === '---') inFrontmatter = false;
			return line;
		}

		const fence = line.match(/^\s*(`{3,}|~{3,})/);
		if (fence) {
			const marker = fence[1][0];
			if (!inFence) {
				inFence = true;
				fenceMarker = marker;
			} else if (marker === fenceMarker) {
				inFence = false;
				fenceMarker = '';
			}
			return line;
		}

		if (inFence || /^(?: {4}|\t)/.test(line)) return line;
		return transformOutsideInlineCode(line);
	});

	return normalized.join('\n').replace(/\n+$/g, '') + '\n';
}

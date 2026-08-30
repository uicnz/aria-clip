const MAX_FILENAME_STEM_BYTES = 240;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function truncateUtf8(value: string, maxBytes: number): string {
	const encoder = new TextEncoder();
	let result = '';
	let byteLength = 0;

	for (const character of value) {
		const characterBytes = encoder.encode(character).length;
		if (byteLength + characterBytes > maxBytes) break;
		result += character;
		byteLength += characterBytes;
	}

	return result;
}

/**
 * Convert a human-readable note name into a portable filesystem basename.
 * Visible titles and metadata should retain their original values; this is
 * only for the filename used at the storage boundary.
 */
export function sanitizeFilename(value: string): string {
	let filename = value
		.normalize('NFKD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	filename = truncateUtf8(filename, MAX_FILENAME_STEM_BYTES).replace(/-+$/g, '');

	if (!filename) return 'untitled';
	if (WINDOWS_RESERVED_NAMES.test(filename)) return `file-${filename}`;

	return filename;
}

export function createMarkdownFilename(value: string): string {
	const withoutExtension = value.replace(/\.md$/i, '');
	return `${sanitizeFilename(withoutExtension)}.md`;
}

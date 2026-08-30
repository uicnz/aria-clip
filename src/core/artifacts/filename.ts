import { MAX_ARTIFACT_TYPE_LENGTH } from './artifact.js';

const MAX_FILENAME_STEM_BYTES = 240;
const MAX_MARKDOWN_FILENAME_BYTES = 243;
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
	return createArtifactMarkdownFilename(value);
}

export function createArtifactMarkdownFilename(value: string, artifactType?: string): string {
	const withoutExtension = value.replace(/\.md$/i, '');
	const type = artifactType?.trim()
		? truncateUtf8(sanitizeFilename(artifactType), MAX_ARTIFACT_TYPE_LENGTH).replace(/-+$/g, '')
		: '';
	const suffix = `${type ? `.${type}` : ''}.md`;
	const suffixBytes = new TextEncoder().encode(suffix).length;
	const stem = truncateUtf8(
		sanitizeFilename(withoutExtension),
		MAX_MARKDOWN_FILENAME_BYTES - suffixBytes,
	).replace(/-+$/g, '') || 'untitled';
	return `${stem}${suffix}`;
}

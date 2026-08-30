export interface PageMetadata {
	author: string;
	published: string;
	description: string;
}

type PartialPageMetadata = Partial<PageMetadata>;

const ARXIV_MONTHS: Readonly<Record<string, string>> = {
	Jan: '01',
	Feb: '02',
	Mar: '03',
	Apr: '04',
	May: '05',
	Jun: '06',
	Jul: '07',
	Aug: '08',
	Sep: '09',
	Oct: '10',
	Nov: '11',
	Dec: '12',
};

function cleanText(value: string | null | undefined): string {
	return (value ?? '').replace(/\s+/g, ' ').trim();
}

function isArxivHtml(url: string): boolean {
	try {
		const parsed = new URL(url);
		return /^(?:www\.)?arxiv\.org$/i.test(parsed.hostname) && parsed.pathname.startsWith('/html/');
	} catch {
		return false;
	}
}

function extractArxivAuthors(document: Document): string {
	const authors: string[] = [];
	for (const element of document.querySelectorAll('.ltx_authors .ltx_personname')) {
		const cleanElement = element.cloneNode(true) as Element;
		cleanElement.querySelectorAll('.ltx_note').forEach(note => note.remove());
		const name = cleanText(cleanElement.textContent);
		if (name && !authors.includes(name)) authors.push(name);
	}
	return authors.join(', ');
}

function extractArxivVersionDate(document: Document): string {
	const watermark = cleanText(document.querySelector('#watermark-tr')?.textContent);
	const match = watermark.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);
	if (!match) return '';
	const [, day, month, year] = match;
	return `${year}-${ARXIV_MONTHS[month]}-${day.padStart(2, '0')}`;
}

function extractArxivAbstract(document: Document): string {
	return Array.from(document.querySelectorAll('.ltx_abstract .ltx_p'))
		.map(paragraph => cleanText(paragraph.textContent))
		.filter(Boolean)
		.join(' ');
}

export function extractPageMetadata(document: Document, url: string): PartialPageMetadata {
	if (!isArxivHtml(url)) return {};
	return {
		author: extractArxivAuthors(document),
		published: extractArxivVersionDate(document),
		description: extractArxivAbstract(document),
	};
}

export function enrichPageMetadata(
	document: Document,
	url: string,
	metadata: PartialPageMetadata,
): PageMetadata {
	const fallback = extractPageMetadata(document, url);
	return {
		author: cleanText(metadata.author) || fallback.author || '',
		published: cleanText(metadata.published) || fallback.published || '',
		description: cleanText(metadata.description) || fallback.description || '',
	};
}

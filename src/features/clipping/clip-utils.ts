import { extractFull } from '../../core/clipping/defuddle-full.js';
import { setElementHTML } from '../../shared/dom/dom-utils.js';

// Parse document content for clipping. In reader mode, extracts from
// the article's original HTML to avoid reader UI artifacts.
export function parseForClip(doc: Document) {
	const readerArticle = doc.querySelector('.aria-reader-active .aria-reader-content article');
	if (readerArticle) {
		const readerDoc = doc.implementation.createHTMLDocument();
		const originalHtml = readerArticle.getAttribute('data-original-html');
		if (originalHtml) {
			setElementHTML(readerDoc.body, originalHtml);
		} else {
			readerDoc.body.replaceChildren(
				...Array.from(readerArticle.childNodes).map(n => readerDoc.importNode(n, true))
			);
		}
		return extractFull(readerDoc, { url: '' });
	}
	return extractFull(doc, { url: doc.URL });
}

import { parseHTML } from 'linkedom';
import { describe, expect, test } from 'vitest';
import { enrichPageMetadata, extractPageMetadata } from './metadata.js';

const ARXIV_HTML = `
	<div id="watermark-tr">
		arXiv:1706.03762v7 [cs.CL] 02 Aug 2023
	</div>
	<article class="ltx_document">
		<div class="ltx_authors">
			<span class="ltx_personname">Ashish Vaswani</span>
			<span class="ltx_personname">Noam Shazeer
				<span class="ltx_note"><sup>1</sup><span>footnotemark: 1</span></span>
			</span>
			<span class="ltx_personname">Niki Parmar</span>
		</div>
		<div class="ltx_abstract">
			<h6 class="ltx_title">Abstract</h6>
			<p class="ltx_p">The Transformer uses attention alone.</p>
			<p class="ltx_p">It improves parallelism during training.</p>
		</div>
	</article>
`;

describe('page metadata', () => {
	test('extracts arXiv authors, version date, and abstract', () => {
		const { document } = parseHTML(ARXIV_HTML);

		expect(extractPageMetadata(document, 'https://arxiv.org/html/1706.03762')).toEqual({
			author: 'Ashish Vaswani, Noam Shazeer, Niki Parmar',
			published: '2023-08-02',
			description: 'The Transformer uses attention alone. It improves parallelism during training.',
		});
	});

	test('does not apply arXiv markup rules to unrelated pages', () => {
		const { document } = parseHTML(ARXIV_HTML);

		expect(extractPageMetadata(document, 'https://example.com/paper')).toEqual({});
	});

	test('uses arXiv values only when ordinary metadata is missing', () => {
		const { document } = parseHTML(ARXIV_HTML);

		expect(enrichPageMetadata(document, 'https://arxiv.org/html/1706.03762', {
			author: 'Existing Author',
			published: '2017-06-12',
			description: 'Existing description',
		})).toEqual({
			author: 'Existing Author',
			published: '2017-06-12',
			description: 'Existing description',
		});
	});
});

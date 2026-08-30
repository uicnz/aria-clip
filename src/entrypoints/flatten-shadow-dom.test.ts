import '@/test/dom.js';
import { describe, expect, test } from 'bun:test';

describe('flatten shadow DOM page-world entry', () => {
	test('stamps open shadow-root HTML onto its host', async () => {
		const host = document.createElement('section');
		host.attachShadow({ mode: 'open' }).innerHTML = '<p>Shadow content</p>';
		document.body.appendChild(host);

		await import('./flatten-shadow-dom.js');

		expect(host.getAttribute('data-defuddle-shadow')).toBe('<p>Shadow content</p>');
	});
});

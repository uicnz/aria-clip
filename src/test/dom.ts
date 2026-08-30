import { afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
	url: 'https://example.com/',
	pretendToBeVisual: true,
});

const { window } = dom;
const values = {
	window,
	document: window.document,
	navigator: window.navigator,
	location: window.location,
	Node: window.Node,
	Text: window.Text,
	Comment: window.Comment,
	NodeFilter: window.NodeFilter,
	Element: window.Element,
	HTMLElement: window.HTMLElement,
	HTMLAnchorElement: window.HTMLAnchorElement,
	HTMLButtonElement: window.HTMLButtonElement,
	HTMLDialogElement: window.HTMLDialogElement,
	HTMLInputElement: window.HTMLInputElement,
	HTMLTextAreaElement: window.HTMLTextAreaElement,
	SVGElement: window.SVGElement,
	ShadowRoot: window.ShadowRoot,
	Document: window.Document,
	DocumentFragment: window.DocumentFragment,
	DOMParser: window.DOMParser,
	XMLSerializer: window.XMLSerializer,
	MutationObserver: window.MutationObserver,
	Range: window.Range,
	XPathResult: window.XPathResult,
	Event: window.Event,
	CustomEvent: window.CustomEvent,
	MouseEvent: window.MouseEvent,
	KeyboardEvent: window.KeyboardEvent,
	InputEvent: window.InputEvent,
	File: window.File,
	FileReader: window.FileReader,
	customElements: window.customElements,
	localStorage: window.localStorage,
	sessionStorage: window.sessionStorage,
	getComputedStyle: window.getComputedStyle.bind(window),
	requestAnimationFrame: window.requestAnimationFrame.bind(window),
	cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
	IS_REACT_ACT_ENVIRONMENT: true,
};

for (const [name, value] of Object.entries(values)) {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		writable: true,
		value,
	});
}

afterEach(() => {
	document.head.textContent = '';
	document.body.textContent = '';
	localStorage.clear();
	sessionStorage.clear();
});

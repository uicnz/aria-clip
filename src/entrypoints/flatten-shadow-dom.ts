// Runs in the MAIN world to expose shadow DOM content to Defuddle.
// The isolated content script reads the stamped HTML through the shared DOM.
document.querySelectorAll<HTMLElement>('*').forEach((element) => {
	const shadowHtml = element.shadowRoot?.innerHTML;
	if (shadowHtml) {
		element.setAttribute('data-defuddle-shadow', shadowHtml);
	}
});

export {};

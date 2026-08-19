export function showModal(modal: HTMLElement | string | null): void {
	const id = typeof modal === 'string' ? modal : modal?.id;
	if (id) {
		window.dispatchEvent(new CustomEvent('aria-dialog-change', {
			detail: { id, open: true }
		}));
	}
}

export function hideModal(modal: HTMLElement | string | null): void {
	const id = typeof modal === 'string' ? modal : modal?.id;
	if (id) {
		window.dispatchEvent(new CustomEvent('aria-dialog-change', {
			detail: { id, open: false }
		}));

		// Clear the textarea content
		const textarea = modal instanceof HTMLElement ? modal.querySelector('#import-json-textarea') as HTMLTextAreaElement : null;
		if (textarea) {
			textarea.value = '';
		}
	}
}

const MODAL_MOUNT_TIMEOUT_MS = 1000;

function waitForModal(id: string): Promise<HTMLElement | null> {
	const mountedModal = document.getElementById(id);
	if (mountedModal) return Promise.resolve(mountedModal);

	return new Promise((resolve) => {
		let timeoutId: number | undefined;
		const observer = new MutationObserver(() => {
			const nextModal = document.getElementById(id);
			if (!nextModal) return;

			observer.disconnect();
			if (timeoutId !== undefined) window.clearTimeout(timeoutId);
			resolve(nextModal);
		});

		observer.observe(document.documentElement, { childList: true, subtree: true });
		timeoutId = window.setTimeout(() => {
			observer.disconnect();
			resolve(document.getElementById(id));
		}, MODAL_MOUNT_TIMEOUT_MS);
	});
}

export function showModal(modal: HTMLElement | string | null): Promise<HTMLElement | null> {
	const id = typeof modal === 'string' ? modal : modal?.id;
	if (!id) return Promise.resolve(null);

	window.dispatchEvent(new CustomEvent('aria-dialog-change', {
		detail: { id, open: true }
	}));

	return waitForModal(id);
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

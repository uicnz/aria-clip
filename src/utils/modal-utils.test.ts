// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { showModal } from './modal-utils.js';

describe('showModal', () => {
	afterEach(() => {
		document.body.textContent = '';
		vi.restoreAllMocks();
	});

	test('returns a modal that is already mounted', async () => {
		const modal = document.createElement('div');
		modal.id = 'provider-modal';
		document.body.appendChild(modal);

		await expect(showModal('provider-modal')).resolves.toBe(modal);
	});

	test('waits for a controlled dialog to mount', async () => {
		const mountDialog = (event: Event) => {
			const { id, open } = (event as CustomEvent<{ id: string; open: boolean }>).detail;
			if (!open) return;

			window.setTimeout(() => {
				const modal = document.createElement('div');
				modal.id = id;
				document.body.appendChild(modal);
			}, 0);
		};
		window.addEventListener('aria-dialog-change', mountDialog, { once: true });

		const modal = await showModal('provider-modal');

		expect(modal?.id).toBe('provider-modal');
	});
});

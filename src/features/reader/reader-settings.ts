import { generalSettings, loadSettings, saveSettings } from '../../platform/browser/storage-utils.js';
import { debounce } from '../../shared/async/debounce.js';

function getIsDark(appearance: string): boolean {
	if (appearance === 'dark') return true;
	if (appearance === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
	return false;
}

function updatePreview() {
	const preview = document.getElementById('reader-preview');
	if (!preview) return;

	const { appearance, fontSize, lineHeight, colorLinks } = generalSettings.readerSettings;
	const isDark = getIsDark(appearance);
	preview.classList.toggle('theme-dark', isDark);
	preview.classList.toggle('theme-light', !isDark);

	preview.style.setProperty('--font-text-size', `${fontSize}px`);
	preview.style.setProperty('--line-height-normal', String(lineHeight));
	preview.classList.toggle('color-links', colorLinks);
}

export function refreshReaderPreview(): void {
	updatePreview();
}

export async function initializeReaderSettings() {
	const form = document.getElementById('reader-settings-form');
	if (!form) return;

	await loadSettings();

	const fontSizeInput = document.getElementById('reader-font-size') as HTMLInputElement;
	const fontSizeDisplay = document.getElementById('reader-font-size-display');
	if (fontSizeInput) {
		fontSizeInput.value = String(generalSettings.readerSettings.fontSize);
		if (fontSizeDisplay) fontSizeDisplay.textContent = fontSizeInput.value;
		fontSizeInput.addEventListener('input', () => {
			if (fontSizeDisplay) fontSizeDisplay.textContent = fontSizeInput.value;
			const val = parseFloat(fontSizeInput.value);
			if (!isNaN(val)) {
				generalSettings.readerSettings.fontSize = val;
				updatePreview();
			}
		});
		fontSizeInput.addEventListener('change', () => {
			const val = parseFloat(fontSizeInput.value);
			if (isNaN(val)) return;
			saveSettings({ ...generalSettings, readerSettings: { ...generalSettings.readerSettings, fontSize: val } });
		});
	}

	const lineHeightInput = document.getElementById('reader-line-height') as HTMLInputElement;
	const lineHeightDisplay = document.getElementById('reader-line-height-display');
	if (lineHeightInput) {
		lineHeightInput.value = String(generalSettings.readerSettings.lineHeight);
		if (lineHeightDisplay) lineHeightDisplay.textContent = parseFloat(lineHeightInput.value).toFixed(1);
		lineHeightInput.addEventListener('input', () => {
			if (lineHeightDisplay) lineHeightDisplay.textContent = parseFloat(lineHeightInput.value).toFixed(1);
			const val = parseFloat(lineHeightInput.value);
			if (!isNaN(val)) {
				generalSettings.readerSettings.lineHeight = val;
				updatePreview();
			}
		});
		lineHeightInput.addEventListener('change', () => {
			const val = parseFloat(lineHeightInput.value);
			if (isNaN(val)) return;
			saveSettings({ ...generalSettings, readerSettings: { ...generalSettings.readerSettings, lineHeight: val } });
		});
	}

	const maxWidthInput = document.getElementById('reader-max-width') as HTMLInputElement;
	const maxWidthDisplay = document.getElementById('reader-max-width-display');
	if (maxWidthInput) {
		maxWidthInput.value = String(generalSettings.readerSettings.maxWidth);
		if (maxWidthDisplay) maxWidthDisplay.textContent = maxWidthInput.value;
		maxWidthInput.addEventListener('input', () => {
			if (maxWidthDisplay) maxWidthDisplay.textContent = maxWidthInput.value;
		});
		maxWidthInput.addEventListener('change', () => {
			const val = parseFloat(maxWidthInput.value);
			if (isNaN(val)) return;
			saveSettings({ ...generalSettings, readerSettings: { ...generalSettings.readerSettings, maxWidth: val } });
		});
	}

	const themeModeSelect = document.getElementById('reader-appearance') as HTMLSelectElement;
	if (themeModeSelect) {
		themeModeSelect.value = generalSettings.readerSettings.appearance;
		themeModeSelect.addEventListener('change', () => {
			saveSettings({ ...generalSettings, readerSettings: { ...generalSettings.readerSettings, appearance: themeModeSelect.value as 'auto' | 'light' | 'dark' } });
			updatePreview();
		});
	}

	const customCssInput = document.getElementById('reader-custom-css') as HTMLTextAreaElement;
	if (customCssInput) {
		customCssInput.value = generalSettings.readerSettings.customCss ?? '';
		customCssInput.addEventListener('input', debounce(() => {
			saveSettings({ ...generalSettings, readerSettings: { ...generalSettings.readerSettings, customCss: customCssInput.value } });
		}, 500));
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		updatePreview();
	});

	updatePreview();
}

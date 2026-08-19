import browser from './browser-polyfill.js';

export type ExtensionAppearance = 'auto' | 'light' | 'dark';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function normalizeAppearance(value: unknown): ExtensionAppearance {
	return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function isDarkMode(appearance: ExtensionAppearance = 'auto'): boolean {
	if (appearance === 'dark') return true;
	if (appearance === 'light') return false;
	return window.matchMedia(DARK_MEDIA_QUERY).matches;
}

export function applyExtensionTheme(
	target: HTMLElement,
	appearance: ExtensionAppearance,
): void {
	const dark = isDarkMode(appearance);
	target.classList.toggle('dark', dark);
	target.classList.toggle('theme-dark', dark);
	target.classList.toggle('theme-light', !dark);
	target.dataset.appearance = appearance === 'auto' ? 'system' : appearance;
}

export async function getExtensionAppearance(): Promise<ExtensionAppearance> {
	const data = await browser.storage.sync.get('reader_settings') as {
		reader_settings?: { appearance?: unknown };
	};
	return normalizeAppearance(data.reader_settings?.appearance);
}

/**
	* Applies the saved appearance and keeps the target synchronized with storage
	* updates and live system color-scheme changes.
	*/
export async function initializeExtensionTheme(
	target: HTMLElement = document.documentElement,
): Promise<() => void> {
	let appearance = await getExtensionAppearance();
	applyExtensionTheme(target, appearance);

	const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
	const handleSystemChange = () => {
		if (appearance === 'auto') applyExtensionTheme(target, appearance);
	};
	mediaQuery.addEventListener('change', handleSystemChange);

	const handleStorageChange = (
		changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
		areaName: string,
	) => {
		if (areaName !== 'sync' || !changes.reader_settings) return;
		const next = changes.reader_settings.newValue as { appearance?: unknown } | undefined;
		appearance = normalizeAppearance(next?.appearance);
		applyExtensionTheme(target, appearance);
	};
	browser.storage.onChanged.addListener(handleStorageChange);

	return () => {
		mediaQuery.removeEventListener('change', handleSystemChange);
		browser.storage.onChanged.removeListener(handleStorageChange);
	};
}

export function observeColorScheme(callback: (isDark: boolean) => void): () => void {
	const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
	const listener = (event: MediaQueryListEvent) => callback(event.matches);
	mediaQuery.addEventListener('change', listener);
	callback(mediaQuery.matches);
	return () => mediaQuery.removeEventListener('change', listener);
}

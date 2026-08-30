import browser from '../platform/browser/browser-polyfill.js';
import { AnyHighlightData, StoredData, DomainSettings, buildExportedPage, normalizeUrl } from '../features/highlights/highlighter.js';
import { translatePage, getMessage, setupLanguageAndDirection } from '../platform/browser/i18n.js';
import { addBrowserClassToHtml, detectBrowser } from '../platform/browser/browser-detection.js';
import DOMPurify from 'dompurify';
import { Defuddle } from '../core/clipping/defuddle.js';
import { createMarkdownContent } from 'defuddle/full';
import { normalizeMarkdownOutput } from '../core/markdown/markdown-output.js';
import { ReaderSettings } from '../types/types.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { createIcons } from 'lucide';
import { icons } from '../icons/icons.js';
import { initializeMenu } from '../shared/dom/menu.js';
import { initializeExtensionTheme } from '../platform/browser/theme-utils.js';
import { mountHighlightsShell } from '../components/highlights/highlights-shell.js';

void initializeExtensionTheme();
mountHighlightsShell();

dayjs.extend(relativeTime);

interface DomainGroup {
	domain: string;
	pages: PageGroup[];
	totalHighlights: number;
}

interface PageGroup {
	url: string;
	path: string;
	title?: string;
	highlights: HighlightEntry[];
}

interface HighlightEntry {
	data: AnyHighlightData;
	url: string;
}

// Navigation state: what the user is viewing
type NavSelection =
	| { type: 'all' }
	| { type: 'domain'; domain: string }
	| { type: 'page'; domain: string; url: string };

type SortOrder = 'az' | 'za' | 'new' | 'old';

let allDomainGroups: DomainGroup[] = [];
let domainSettingsMap: Record<string, DomainSettings> = {};
let searchQuery = '';
let currentNav: NavSelection = { type: 'all' };
let expandedSidebarDomains = new Set<string>();
let sortOrder: SortOrder = 'az';
const faviconCache = new Map<string, HTMLImageElement>();

// Batched rendering
const BATCH_SIZE = 50;
// Each entry in flatEntries is one render unit — a single highlight, or a
// group of highlights sharing a groupId that should render as one card.
interface RenderUnit { entries: HighlightEntry[]; pageUrl: string; domain: string; title?: string }
let flatEntries: RenderUnit[] = [];
let renderedCount = 0;
let currentPageGroup: HTMLElement | null = null;
let observer: IntersectionObserver | null = null;

document.addEventListener('DOMContentLoaded', async () => {
	await setupLanguageAndDirection();
	await translatePage();
	addBrowserClassToHtml();
	await applyReaderTheme();

	currentNav = readNavFromUrl();
	await loadData();
	// Auto-expand the domain in sidebar if navigating to a specific domain or page
	if (currentNav.type === 'domain' || currentNav.type === 'page') {
		expandedSidebarDomains.add(currentNav.domain);
	}
	renderSidebar();
	renderMain();

	const searchInput = document.getElementById('highlights-search') as HTMLInputElement;
	searchInput.addEventListener('input', () => {
		searchQuery = searchInput.value.toLowerCase().trim();
		renderSidebar();
		renderMain();
	});

	const deleteBtn = document.getElementById('delete-context-btn') as HTMLButtonElement;
	deleteBtn.addEventListener('click', deleteCurrentContext);

	const exportBtn = document.getElementById('export-context-btn') as HTMLButtonElement;
	exportBtn.addEventListener('click', exportCurrentContext);

	initializeMenu('highlights-sort-btn', 'highlights-sort-menu');
	const sortMenu = document.getElementById('highlights-sort-menu')!;
	sortMenu.querySelectorAll<HTMLElement>('.menu-item[data-sort]').forEach(item => {
		item.addEventListener('click', () => {
			const value = item.dataset.sort as SortOrder;
			if (value === sortOrder) return;
			sortOrder = value;
			updateSortMenuActiveState();
			renderSidebar();
		});
	});
	updateSortMenuActiveState();

	const sidebarTitle = document.getElementById('highlights-sidebar-title');
	sidebarTitle?.addEventListener('click', () => navigate({ type: 'all' }));

	const settingsLink = document.getElementById('highlights-settings-link');
	settingsLink?.addEventListener('click', (e) => e.stopPropagation());

	const navbarTitle = document.getElementById('highlights-navbar-title');
	navbarTitle?.addEventListener('click', () => navigate({ type: 'all' }));

	// Mobile hamburger
	const hamburger = document.getElementById('highlights-hamburger');
	const container = document.getElementById('highlights');
	if (hamburger && container) {
		hamburger.addEventListener('click', () => {
			container.classList.toggle('sidebar-open');
			hamburger.classList.toggle('is-active');
		});
	}

	// Listen for storage changes
	browser.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && changes.highlights) {
			loadData().then(() => {
				if (!updateSidebarCounts()) {
					renderSidebar();
				}
				if (!updateMainIncremental()) {
					renderMain();
				}
			});
		}
		if (area === 'sync' && changes.reader_settings) {
			applyReaderTheme().then(() => {
				reapplyThemeToPageGroups();
			});
		}
	});

	// Set up sentinel observer for infinite scroll
	const sentinel = document.getElementById('highlights-sentinel')!;
	observer = new IntersectionObserver((entries) => {
		if (entries[0].isIntersecting) {
			renderNextBatch();
		}
	}, { rootMargin: '200px' });
	observer.observe(sentinel);

	createIcons({ icons });
});

// --- Reader theme ---

let highlightAppearanceClasses: string[] = [];

async function applyReaderTheme() {
	const data = await browser.storage.sync.get('reader_settings');
	const settings = data.reader_settings as ReaderSettings | undefined;

	const isDark = settings
		? settings.appearance === 'dark' || (settings.appearance === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
		: window.matchMedia('(prefers-color-scheme: dark)').matches;

	highlightAppearanceClasses = ['aria-reader-active', isDark ? 'theme-dark' : 'theme-light'];

	if (settings) {
		// Font settings apply globally
		const html = document.documentElement;
		html.style.setProperty('--font-text-size', `${settings.fontSize}px`);
		html.style.setProperty('--line-height-normal', settings.lineHeight.toString());

	}
}

function applyThemeToElement(el: HTMLElement) {
	el.classList.remove('theme-dark', 'theme-light');
	for (const cls of highlightAppearanceClasses) {
		el.classList.add(cls);
	}
}

function reapplyThemeToPageGroups() {
	const groups = document.querySelectorAll<HTMLElement>('.highlight-page-group');
	groups.forEach(el => applyThemeToElement(el));
}

// --- Data loading ---

async function loadData() {
	const result = await browser.storage.local.get(['highlights', 'domains']);
	const allHighlights = (result.highlights || {}) as Record<string, StoredData>;
	domainSettingsMap = (result.domains || {}) as Record<string, DomainSettings>;

	// Merge entries that normalize to the same URL
	const mergedMap = new Map<string, { stored: StoredData; originalKeys: string[] }>();
	for (const [urlKey, stored] of Object.entries(allHighlights)) {
		if (!stored.highlights || stored.highlights.length === 0) continue;
		const normUrl = normalizeUrl(stored.url || urlKey);
		const existing = mergedMap.get(normUrl);
		if (existing) {
			// Merge highlights, keep best title
			existing.stored.highlights = [...existing.stored.highlights, ...stored.highlights];
			if (!existing.stored.title && stored.title) existing.stored.title = stored.title;
			existing.originalKeys.push(urlKey);
		} else {
			mergedMap.set(normUrl, {
				stored: { ...stored, url: normUrl, highlights: [...stored.highlights] },
				originalKeys: [urlKey],
			});
		}
	}

	// Persist merges if any duplicates were found
	let needsSave = false;
	for (const [normUrl, { stored, originalKeys }] of mergedMap) {
		if (originalKeys.length > 1 || originalKeys[0] !== normUrl) {
			needsSave = true;
			for (const key of originalKeys) {
				if (key !== normUrl) delete allHighlights[key];
			}
			allHighlights[normUrl] = stored;
		}
	}
	if (needsSave) {
		browser.storage.local.set({ highlights: allHighlights });
	}

	const domainMap = new Map<string, PageGroup[]>();

	for (const [, { stored }] of mergedMap) {
		let domain: string;
		let path: string;
		try {
			const parsed = new URL(stored.url);
			domain = parsed.hostname.replace(/^www\./, '');
			path = parsed.pathname + parsed.search;
		} catch {
			domain = stored.url;
			path = '/';
		}

		if (!domainMap.has(domain)) {
			domainMap.set(domain, []);
		}

		domainMap.get(domain)!.push({
			url: stored.url,
			path,
			title: stored.title,
			highlights: stored.highlights.map(h => ({ data: h, url: stored.url })),
		});
	}

	allDomainGroups = Array.from(domainMap.entries())
		.map(([domain, pages]) => ({
			domain,
			pages: pages.sort((a, b) => a.path.localeCompare(b.path)),
			totalHighlights: pages.reduce((sum, p) => sum + p.highlights.length, 0),
		}));

	// If current nav references something that no longer exists, reset
	const nav = currentNav;
	if (nav.type === 'domain') {
		if (!allDomainGroups.find(g => g.domain === nav.domain)) {
			currentNav = { type: 'all' };
		}
	} else if (nav.type === 'page') {
		const group = allDomainGroups.find(g => g.domain === nav.domain);
		if (!group || !group.pages.find(p => p.url === nav.url)) {
			currentNav = { type: 'all' };
		}
	}
}

// --- Search ---

function matchesSearch(entry: HighlightEntry): boolean {
	if (!searchQuery) return true;
	const content = entry.data.content?.toLowerCase() || '';
	const notes = entry.data.notes?.join(' ').toLowerCase() || '';
	const url = entry.url.toLowerCase();
	return content.includes(searchQuery) || notes.includes(searchQuery) || url.includes(searchQuery);
}

function getFilteredGroups(): DomainGroup[] {
	if (!searchQuery) return sortGroups([...allDomainGroups]);

	const filtered: DomainGroup[] = [];
	for (const group of allDomainGroups) {
		// Check if domain/site name matches — if so, include all pages
		const normalized = group.domain.replace(/^www\./, '');
		const siteName = domainSettingsMap[normalized]?.site?.toLowerCase() || '';
		const domainMatches = group.domain.toLowerCase().includes(searchQuery) || siteName.includes(searchQuery);

		const filteredPages: PageGroup[] = [];
		for (const page of group.pages) {
			// Check if page title matches — if so, include all its highlights
			const titleMatches = page.title?.toLowerCase().includes(searchQuery) || false;

			if (domainMatches || titleMatches) {
				filteredPages.push(page);
			} else {
				const filteredHighlights = page.highlights.filter(matchesSearch);
				if (filteredHighlights.length > 0) {
					filteredPages.push({ ...page, highlights: filteredHighlights });
				}
			}
		}
		if (filteredPages.length > 0) {
			filtered.push({
				...group,
				pages: filteredPages,
				totalHighlights: filteredPages.reduce((sum, p) => sum + p.highlights.length, 0),
			});
		}
	}
	return sortGroups(filtered);
}

function newestTimestamp(group: DomainGroup): number {
	let max = 0;
	for (const page of group.pages) {
		for (const h of page.highlights) {
			const t = parseInt(h.data.id) || 0;
			if (t > max) max = t;
		}
	}
	return max;
}

function oldestTimestamp(group: DomainGroup): number {
	let min = Infinity;
	for (const page of group.pages) {
		for (const h of page.highlights) {
			const t = parseInt(h.data.id) || Infinity;
			if (t < min) min = t;
		}
	}
	return min;
}

function sortGroups(groups: DomainGroup[]): DomainGroup[] {
	switch (sortOrder) {
		case 'az':
			return groups.sort((a, b) => displayDomain(a.domain).localeCompare(displayDomain(b.domain)));
		case 'za':
			return groups.sort((a, b) => displayDomain(b.domain).localeCompare(displayDomain(a.domain)));
		case 'new':
			return groups.sort((a, b) => newestTimestamp(b) - newestTimestamp(a));
		case 'old':
			return groups.sort((a, b) => oldestTimestamp(a) - oldestTimestamp(b));
	}
}

// --- Sidebar ---

function navigate(nav: NavSelection) {
	currentNav = nav;
	updateUrlFromNav();
	updateSidebarActiveState();
	renderMain();

	// Close mobile sidebar
	const container = document.getElementById('highlights');
	const hamburger = document.getElementById('highlights-hamburger');
	container?.classList.remove('sidebar-open');
	hamburger?.classList.remove('is-active');
}

function updateSortMenuActiveState() {
	const menu = document.getElementById('highlights-sort-menu');
	if (!menu) return;
	menu.querySelectorAll<HTMLElement>('.menu-item[data-sort]').forEach(item => {
		item.classList.toggle('is-active', item.dataset.sort === sortOrder);
	});
}

function updateSidebarActiveState() {
	const domainListEl = document.getElementById('highlights-domain-list')!;
	domainListEl.querySelectorAll('.nav-domain').forEach(li => {
		const domain = li.getAttribute('data-domain');
		li.classList.toggle('active', currentNav.type === 'domain' && currentNav.domain === domain);
	});
	domainListEl.querySelectorAll('.nav-page').forEach(li => {
		const url = li.getAttribute('data-url');
		li.classList.toggle('active', currentNav.type === 'page' && (currentNav as { url: string }).url === url);
	});
}

function updateUrlFromNav() {
	const params = new URLSearchParams();
	if (currentNav.type === 'domain') {
		params.set('domain', currentNav.domain);
	} else if (currentNav.type === 'page') {
		params.set('domain', currentNav.domain);
		params.set('url', currentNav.url);
	}
	const search = params.toString();
	const newUrl = window.location.pathname + (search ? '?' + search : '');
	window.history.replaceState({}, '', newUrl);
}

function readNavFromUrl(): NavSelection {
	const params = new URLSearchParams(window.location.search);
	const domain = params.get('domain')?.replace(/^www\./, '');
	const url = params.get('url');
	if (url && domain) {
		return { type: 'page', domain, url };
	} else if (domain) {
		return { type: 'domain', domain };
	}
	return { type: 'all' };
}

function createPageSubItems(group: DomainGroup): HTMLElement[] {
	const items: HTMLElement[] = [];
	for (const page of group.pages) {
		const isPageActive = currentNav.type === 'page'
			&& (currentNav as { domain: string; url: string }).domain === group.domain
			&& (currentNav as { url: string }).url === page.url;

		const pageLi = document.createElement('li');
		pageLi.className = 'nav-page ml-6 flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-xs/relaxed text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium' + (isPageActive ? ' active' : '');
		pageLi.setAttribute('data-url', page.url);

		const pageName = document.createElement('span');
		pageName.className = 'nav-page-name min-w-0 flex-1 truncate';
		pageName.textContent = page.title || displayPath(page.path);
		pageName.title = page.url;
		pageLi.appendChild(pageName);

		const pageCount = document.createElement('span');
		pageCount.className = 'nav-count text-[0.625rem] tabular-nums text-muted-foreground';
		pageCount.textContent = String(page.highlights.length);
		pageLi.appendChild(pageCount);

		pageLi.addEventListener('click', (e) => {
			e.stopPropagation();
			navigate({ type: 'page', domain: group.domain, url: page.url });
		});

		items.push(pageLi);
	}
	return items;
}

// Update sidebar counts in-place without a full rebuild.
// Returns true if successful, false if a full renderSidebar() is needed.
function updateSidebarCounts(): boolean {
	const domainListEl = document.getElementById('highlights-domain-list')!;
	const filtered = getFilteredGroups();
	const groupMap = new Map<string, DomainGroup>();
	const pageCountMap = new Map<string, number>();
	for (const g of filtered) {
		groupMap.set(g.domain, g);
		for (const p of g.pages) pageCountMap.set(p.url, p.highlights.length);
	}

	// Check that rendered domains match filtered domains
	const domainItems = Array.from(domainListEl.querySelectorAll<HTMLElement>('.nav-domain'));
	if (domainItems.length !== filtered.length) return false;
	for (const group of filtered) {
		const cached = sidebarNodeCache.get(group.domain);
		if (!cached) return false;
		cached.countEl.textContent = String(group.totalHighlights);
	}

	// Page sub-items aren't cached, so query the DOM
	const pageItems = Array.from(domainListEl.querySelectorAll<HTMLElement>('.nav-page'));
	for (let i = 0; i < pageItems.length; i++) {
		const count = pageCountMap.get(pageItems[i].getAttribute('data-url')!);
		if (count !== undefined) {
			const countEl = pageItems[i].querySelector('.nav-count');
			if (countEl) countEl.textContent = String(count);
		}
	}

	return true;
}

interface CachedDomainNode {
	li: HTMLElement;
	countEl: Element;
	chevronWrap: Element;
}
const sidebarNodeCache = new Map<string, CachedDomainNode>();

function renderSidebar() {
	const domainListEl = document.getElementById('highlights-domain-list')!;
	const filtered = getFilteredGroups();

	// Detach children without destroying cached nodes
	domainListEl.replaceChildren();

	// Prune cache entries for domains no longer in data
	const activeDomains = new Set(allDomainGroups.map(g => g.domain));
	for (const domain of sidebarNodeCache.keys()) {
		if (!activeDomains.has(domain)) sidebarNodeCache.delete(domain);
	}

	let needsIcons = false;

	for (const group of filtered) {
		let cached = sidebarNodeCache.get(group.domain);
		if (!cached) {
			cached = createDomainNode(group.domain);
			sidebarNodeCache.set(group.domain, cached);
			needsIcons = true;
		}

		const isDomainActive = currentNav.type === 'domain' && currentNav.domain === group.domain;
		cached.li.classList.toggle('active', isDomainActive);
		cached.countEl.textContent = String(group.totalHighlights);
		const isExpanded = expandedSidebarDomains.has(group.domain);
		cached.chevronWrap.classList.toggle('is-expanded', isExpanded);

		domainListEl.appendChild(cached.li);

		if (isExpanded) {
			for (const pageLi of createPageSubItems(group)) {
				domainListEl.appendChild(pageLi);
			}
		}
	}

	if (needsIcons) createIcons({ icons });
}

function createDomainNode(domain: string): CachedDomainNode {
	const li = document.createElement('li');
	li.className = 'nav-domain flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 text-xs/relaxed text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium';
	li.setAttribute('data-domain', domain);

	const chevronWrap = document.createElement('div');
	chevronWrap.className = 'nav-chevron-wrap flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-transform [&.is-expanded]:rotate-90 [&_svg]:size-3';
	const chevronIcon = document.createElement('i');
	chevronIcon.setAttribute('data-lucide', 'chevron-right');
	chevronWrap.appendChild(chevronIcon);
	li.appendChild(chevronWrap);

	const normalized = domain.replace(/^www\./, '');
	const domainSettings = domainSettingsMap[normalized];
	const siteName = domainSettings?.site;

	if (domainSettings?.favicon) {
		let favicon = faviconCache.get(normalized);
		if (!favicon) {
			favicon = document.createElement('img');
			favicon.className = 'nav-domain-favicon size-4 shrink-0 rounded-sm';
			favicon.src = domainSettings.favicon;
			favicon.width = 16;
			favicon.height = 16;
			favicon.onerror = () => {
				const globe = document.createElement('i');
				globe.className = 'nav-domain-favicon size-3.5 shrink-0 text-muted-foreground';
				globe.setAttribute('data-lucide', 'globe');
				favicon!.replaceWith(globe);
				createIcons({ icons });
			};
			faviconCache.set(normalized, favicon);
		}
		li.appendChild(favicon.cloneNode(true));
	} else {
		const globe = document.createElement('i');
		globe.className = 'nav-domain-favicon size-3.5 shrink-0 text-muted-foreground';
		globe.setAttribute('data-lucide', 'globe');
		li.appendChild(globe);
	}

	const name = document.createElement('span');
	name.className = 'nav-domain-name min-w-0 flex-1 truncate';
	name.textContent = siteName || displayDomain(domain);
	if (siteName) name.title = displayDomain(domain);
	li.appendChild(name);

	const count = document.createElement('span');
	count.className = 'nav-count px-1 text-[0.625rem] tabular-nums text-muted-foreground';
	li.appendChild(count);

	chevronWrap.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleDomainExpand(domain);
	});

	li.addEventListener('click', () => {
		const isActive = currentNav.type === 'domain' && currentNav.domain === domain;
		if (isActive) {
			toggleDomainExpand(domain);
		} else {
			navigate({ type: 'domain', domain });
		}
	});

	return { li, countEl: count, chevronWrap };
}

function toggleDomainExpand(domain: string) {
	const cached = sidebarNodeCache.get(domain);
	if (!cached) return;
	const { li, chevronWrap } = cached;
	if (expandedSidebarDomains.has(domain)) {
		expandedSidebarDomains.delete(domain);
		chevronWrap.classList.remove('is-expanded');
		let next = li.nextElementSibling;
		while (next && next.classList.contains('nav-page')) {
			const toRemove = next;
			next = next.nextElementSibling;
			toRemove.remove();
		}
	} else {
		expandedSidebarDomains.add(domain);
		chevronWrap.classList.add('is-expanded');
		const group = getFilteredGroups().find(g => g.domain === domain);
		if (group) {
			let insertAfter: Element = li;
			for (const pageLi of createPageSubItems(group)) {
				insertAfter.after(pageLi);
				insertAfter = pageLi;
			}
			createIcons({ icons });
		}
	}
}

// --- Main content ---

// Collapse group members (from a multi-block selection) into a single render
// unit so the highlights page shows them as one card. Preserves order and
// groups across the page the selection originated in.
function collapseGroupsForRender(
	entries: { entry: HighlightEntry; pageUrl: string; domain: string; title?: string }[]
): RenderUnit[] {
	const units: RenderUnit[] = [];
	const byKey = new Map<string, RenderUnit>(); // pageUrl::groupId → unit
	for (const e of entries) {
		const gid = e.entry.data.groupId;
		if (gid) {
			const key = `${e.pageUrl}::${gid}`;
			const existing = byKey.get(key);
			if (existing) {
				existing.entries.push(e.entry);
				continue;
			}
			const unit: RenderUnit = { entries: [e.entry], pageUrl: e.pageUrl, domain: e.domain, title: e.title };
			byKey.set(key, unit);
			units.push(unit);
		} else {
			units.push({ entries: [e.entry], pageUrl: e.pageUrl, domain: e.domain, title: e.title });
		}
	}
	return units;
}

function getVisibleEntries(): { entry: HighlightEntry; pageUrl: string; domain: string; title?: string }[] {
	const filtered = getFilteredGroups();
	const nav = currentNav;
	const entries: { entry: HighlightEntry; pageUrl: string; domain: string; title?: string }[] = [];

	for (const group of filtered) {
		if (nav.type === 'domain' && nav.domain !== group.domain) continue;
		if (nav.type === 'page' && nav.domain !== group.domain) continue;

		for (const page of group.pages) {
			if (nav.type === 'page' && nav.url !== page.url) continue;

			for (const highlight of page.highlights) {
				entries.push({ entry: highlight, pageUrl: page.url, domain: group.domain, title: page.title });
			}
		}
	}

	// Page groups newest first; within-page order preserved (stable sort)
	const pageNewest = new Map<string, number>();
	for (const e of entries) {
		const t = parseInt(e.entry.data.id) || 0;
		pageNewest.set(e.pageUrl, Math.max(pageNewest.get(e.pageUrl) || 0, t));
	}
	entries.sort((a, b) => {
		if (a.pageUrl === b.pageUrl) return 0;
		return (pageNewest.get(b.pageUrl) || 0) - (pageNewest.get(a.pageUrl) || 0);
	});

	return entries;
}

// Patch the main content in-place instead of tearing down and rebuilding.
// Returns true if the incremental update succeeded, false to fall back to renderMain().
function updateMainIncremental(): boolean {
	const listEl = document.getElementById('highlights-list')!;
	const newFlatEntries = collapseGroupsForRender(getVisibleEntries());

	const oldKeys = new Set<string>();
	for (let i = 0; i < renderedCount; i++) {
		oldKeys.add(unitKey(flatEntries[i].entries));
	}

	// Compute keys once for new entries, then derive added/removed
	const newKeyList: string[] = [];
	const newKeySet = new Set<string>();
	for (const unit of newFlatEntries) {
		const key = unitKey(unit.entries);
		newKeyList.push(key);
		newKeySet.add(key);
	}

	const addedKeySet = new Set<string>();
	const added: RenderUnit[] = [];
	for (let i = 0; i < newFlatEntries.length; i++) {
		if (!oldKeys.has(newKeyList[i])) {
			addedKeySet.add(newKeyList[i]);
			added.push(newFlatEntries[i]);
		}
	}
	const removedKeys: string[] = [];
	for (const key of oldKeys) {
		if (!newKeySet.has(key)) removedKeys.push(key);
	}

	if (added.length === 0 && removedKeys.length === 0) {
		flatEntries = newFlatEntries;
		return true;
	}

	for (const key of removedKeys) {
		const el = listEl.querySelector<HTMLElement>(`.highlight-item[data-unit-key="${CSS.escape(key)}"]`);
		if (!el) return false;
		const group = el.closest<HTMLElement>('.highlight-page-group');
		el.remove();
		if (group && !group.querySelector('.highlight-item')) {
			group.remove();
		}
	}

	// Insert new highlights in correct DOM-position order
	const pagesWithAdds = new Set(added.map(u => u.pageUrl));

	for (const pageUrl of pagesWithAdds) {
		let group = listEl.querySelector<HTMLElement>(`.highlight-page-group[data-page-url="${CSS.escape(pageUrl)}"]`);
		if (!group) {
			const sample = added.find(u => u.pageUrl === pageUrl)!;
			group = createPageGroupWrapper(pageUrl);
			const header = createPageHeader(pageUrl, sample.domain, sample.title);
			group.appendChild(header);
			listEl.insertBefore(group, listEl.firstChild);
		}

		// Walk desired order and insert before the next existing sibling
		const pageUnits = newFlatEntries.filter(u => u.pageUrl === pageUrl);
		for (let i = 0; i < pageUnits.length; i++) {
			const key = unitKey(pageUnits[i].entries);
			if (!addedKeySet.has(key)) continue;

			let refEl: HTMLElement | null = null;
			for (let j = i + 1; j < pageUnits.length; j++) {
				const sibKey = unitKey(pageUnits[j].entries);
				if (!addedKeySet.has(sibKey)) {
					refEl = group.querySelector<HTMLElement>(`.highlight-item[data-unit-key="${CSS.escape(sibKey)}"]`);
					if (refEl) break;
				}
			}

			const card = createHighlightItem(pageUnits[i].entries, pageUrl);
			group.insertBefore(card, refEl);
		}
	}

	flatEntries = newFlatEntries;
	renderedCount = Math.min(renderedCount + added.length - removedKeys.length, flatEntries.length);
	if (renderedCount < 0) renderedCount = 0;

	createIcons({ icons });
	return true;
}

function renderMain() {
	const listEl = document.getElementById('highlights-list')!;
	const emptyEl = document.getElementById('highlights-empty')!;
	const deleteBtn = document.getElementById('delete-context-btn')!;
	const exportBtn = document.getElementById('export-context-btn')!;

	listEl.textContent = '';
	renderedCount = 0;
	currentPageGroup = null;

	flatEntries = collapseGroupsForRender(getVisibleEntries());

	// Breadcrumb
	renderBreadcrumb();

	// Delete button label
	updateDeleteButton();

	if (flatEntries.length === 0) {
		emptyEl.style.display = '';
		const noData = allDomainGroups.length === 0;
		deleteBtn.style.display = noData ? 'none' : '';
		exportBtn.style.display = noData ? 'none' : '';
		return;
	}

	emptyEl.style.display = 'none';
	deleteBtn.style.display = '';
	exportBtn.style.display = '';

	// Show page in same format as multi-page view
	const nav = currentNav;
	if (nav.type === 'page') {
		const pageGroup = allDomainGroups
			.find(g => g.domain === nav.domain)?.pages
			.find(p => p.url === nav.url);

		currentPageGroup = createPageGroupWrapper(nav.url);
		listEl.appendChild(currentPageGroup);
		const pageHeader = createPageHeader(nav.url, nav.domain, pageGroup?.title);
		currentPageGroup.appendChild(pageHeader);

		renderNextBatch();
		createIcons({ icons });
		return;
	}

	renderNextBatch();
}

function createPageGroupWrapper(pageUrl: string): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'highlight-page-group grid gap-2';
	wrapper.setAttribute('data-page-url', pageUrl);
	applyThemeToElement(wrapper);
	return wrapper;
}

function renderNextBatch() {
	const listEl = document.getElementById('highlights-list')!;
	const end = Math.min(renderedCount + BATCH_SIZE, flatEntries.length);

	if (renderedCount >= flatEntries.length) return;

	// Track which page group we're in to insert page headers
	let lastPageUrl = renderedCount > 0 ? flatEntries[renderedCount - 1].pageUrl : null;

	// For single-page view, ensure we have a group wrapper
	if (currentNav.type === 'page' && !currentPageGroup) {
		const url = flatEntries[renderedCount]?.pageUrl || '';
		currentPageGroup = createPageGroupWrapper(url);
		listEl.appendChild(currentPageGroup);
	}

	for (let i = renderedCount; i < end; i++) {
		const unit = flatEntries[i];
		const { entries, pageUrl, domain, title } = unit;

		// Insert a page header when the URL changes (in all/domain views)
		if (currentNav.type !== 'page' && pageUrl !== lastPageUrl) {
			currentPageGroup = createPageGroupWrapper(pageUrl);
			listEl.appendChild(currentPageGroup);
			const pageHeader = createPageHeader(pageUrl, domain, title);
			currentPageGroup.appendChild(pageHeader);
			lastPageUrl = pageUrl;
		}

		(currentPageGroup || listEl).appendChild(createHighlightItem(entries, pageUrl));
	}

	renderedCount = end;
	createIcons({ icons });
}

function renderBreadcrumb() {
	const breadcrumbEl = document.getElementById('highlights-breadcrumb')!;
	breadcrumbEl.textContent = '';
	const nav = currentNav;

	if (nav.type === 'all') {
		const span = document.createElement('span');
		span.className = 'breadcrumb-current truncate font-medium';
		span.textContent = getMessage('allHighlights');
		breadcrumbEl.appendChild(span);
		return;
	}

	// "All" link
	const allLink = document.createElement('a');
	allLink.className = 'breadcrumb-link shrink-0 text-muted-foreground transition-colors hover:text-foreground';
	allLink.href = '#';
	allLink.textContent = getMessage('allHighlights');
	allLink.addEventListener('click', (e) => {
		e.preventDefault();
		navigate({ type: 'all' });
	});
	breadcrumbEl.appendChild(allLink);

	breadcrumbEl.appendChild(createBreadcrumbSeparator());

	if (nav.type === 'domain') {
		const span = document.createElement('span');
		span.className = 'breadcrumb-current truncate font-medium';
		span.textContent = siteNameOrDomain(nav.domain);
		breadcrumbEl.appendChild(span);
	} else if (nav.type === 'page') {
		const domainSpan = document.createElement('span');
		domainSpan.className = 'breadcrumb-current truncate font-medium';
		domainSpan.textContent = siteNameOrDomain(nav.domain);
		domainSpan.style.cursor = 'pointer';
		domainSpan.addEventListener('click', () => {
			navigate({ type: 'domain', domain: nav.domain });
		});
		breadcrumbEl.appendChild(domainSpan);
	}
}

function createBreadcrumbSeparator(): HTMLElement {
	const sep = document.createElement('span');
	sep.className = 'breadcrumb-separator text-muted-foreground';
	sep.textContent = '/';
	return sep;
}

function updateDeleteButton() {
	const deleteBtn = document.getElementById('delete-context-btn')!;

	deleteBtn.textContent = getMessage('delete');
}

async function deleteCurrentContext() {
	const nav = currentNav;
	if (nav.type === 'all') {
		if (!confirm(getMessage('deleteAllHighlightsConfirm'))) return;
		await browser.storage.local.set({ highlights: {} });
	} else if (nav.type === 'domain') {
		if (!confirm(getMessage('deleteHighlightsForDomain'))) return;
		const group = allDomainGroups.find(g => g.domain === nav.domain);
		if (group) await deleteHighlightsForDomain(group);
	} else if (nav.type === 'page') {
		if (!confirm(getMessage('deleteHighlightsForPage'))) return;
		await deleteHighlightsForUrl(nav.url);
	}
}

async function exportCurrentContext() {
	const entries = getVisibleEntries();
	if (entries.length === 0) return;

	// Group by URL to match the existing export format
	const byUrl = new Map<string, { highlights: HighlightEntry[]; title?: string }>();
	for (const { entry, pageUrl, title } of entries) {
		if (!byUrl.has(pageUrl)) byUrl.set(pageUrl, { highlights: [], title });
		byUrl.get(pageUrl)!.highlights.push(entry);
	}

	const exportData = Array.from(byUrl.entries()).map(([url, page]) =>
		buildExportedPage(url, page.highlights.map(h => h.data), page.title));

	const jsonContent = JSON.stringify(exportData, null, 2);
	const blob = new Blob([jsonContent], { type: 'application/json' });
	const blobUrl = URL.createObjectURL(blob);

	const browserType = await detectBrowser();
	const timestamp = dayjs().format('YYYYMMDDHHmm');
	const fileName = `aria-clip-highlights-${timestamp}.json`;

	if (browserType === 'safari' || browserType === 'mobile-safari') {
		if (navigator.share) {
			try {
				await navigator.share({
					files: [new File([blob], fileName, { type: 'application/json' })],
					title: 'Exported Aria Clip Highlights',
				});
			} catch {
				window.open(blobUrl);
			}
		} else {
			window.open(blobUrl);
		}
	} else {
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	URL.revokeObjectURL(blobUrl);
}

function getLatestTimestamp(url: string): dayjs.Dayjs | null {
	const group = allDomainGroups.find(g => g.pages.some(p => p.url === url));
	const page = group?.pages.find(p => p.url === url);
	if (!page || page.highlights.length === 0) return null;
	let latest = 0;
	for (const h of page.highlights) {
		const t = parseInt(h.data.id);
		if (t > latest) latest = t;
	}
	const time = dayjs(latest);
	return time.isValid() ? time : null;
}

// --- Page headers in main content ---

function createPageHeader(url: string, domain: string, title?: string): HTMLElement {
	const header = document.createElement('div');
	header.className = 'highlight-page-header relative mb-1 flex items-end justify-between gap-3 border-b pb-3';

	const titleText = title || (() => {
		try {
			const parsed = new URL(url);
			return displayPath(parsed.pathname + parsed.search);
		} catch {
			return url;
		}
	})();

	const titleRow = document.createElement('div');
	titleRow.className = 'highlight-page-title-row flex min-w-0 items-center gap-2';

	const titleLink = document.createElement('a');
	titleLink.className = 'highlight-page-title min-w-0 truncate text-base font-medium hover:underline';
	titleLink.href = '#';
	titleLink.title = url;
	titleLink.textContent = titleText;
	titleLink.addEventListener('click', (e) => {
		e.preventDefault();
		navigate({ type: 'page', domain, url });
	});
	titleRow.appendChild(titleLink);

	const readerBtn = document.createElement('a');
	readerBtn.className = 'highlight-reader-btn flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3';
	readerBtn.href = `reader.html?url=${encodeURIComponent(url)}`;
	readerBtn.target = '_blank';
	readerBtn.title = getMessage('loadArticle') || 'Read article';
	const readerIcon = document.createElement('i');
	readerIcon.setAttribute('data-lucide', 'book-open');
	readerBtn.appendChild(readerIcon);
	titleRow.appendChild(readerBtn);

	header.appendChild(titleRow);

	// Site name and latest timestamp
	const metaLine = document.createElement('div');
	metaLine.className = 'highlight-page-meta flex shrink-0 items-center gap-2 text-xs text-muted-foreground';

	const siteSpan = document.createElement('a');
	siteSpan.className = 'highlight-page-site hover:text-foreground';
	siteSpan.href = '#';
	siteSpan.textContent = siteNameOrDomain(domain);
	siteSpan.addEventListener('click', (e) => {
		e.preventDefault();
		navigate({ type: 'domain', domain });
	});
	metaLine.appendChild(siteSpan);

	const latestTime = getLatestTimestamp(url);
	if (latestTime) {
		const timeSpan = document.createElement('span');
		timeSpan.className = 'highlight-page-time before:mr-2 before:content-["·"]';
		timeSpan.textContent = latestTime.fromNow();
		timeSpan.title = latestTime.format('YYYY-MM-DD HH:mm');
		metaLine.appendChild(timeSpan);
	}

	header.appendChild(metaLine);

	// Only show sync button if page has no title yet
	if (!title) {
		const syncBtn = document.createElement('button');
		syncBtn.className = 'highlight-sync-btn absolute right-0 -bottom-8 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&.is-syncing_svg]:animate-spin [&_svg]:size-3';
		const syncIcon = document.createElement('i');
		syncIcon.setAttribute('data-lucide', 'rotate-cw');
		syncBtn.appendChild(syncIcon);
		syncBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			e.preventDefault();
			syncBtn.classList.add('is-syncing');
			const meta = await fetchDefuddled(url);
			syncBtn.classList.remove('is-syncing');
			if (meta) {
				if (meta.title) titleLink.textContent = meta.title;
				if (meta.title || meta.site) syncBtn.style.display = 'none';
			}
		});
		header.appendChild(syncBtn);
	}

	return header;
}

interface DefuddleResult {
	title?: string;
	site?: string;
	content?: string;
}

async function fetchDefuddled(url: string): Promise<DefuddleResult | null> {
	try {
		let html: string;
		const fetchResult = await browser.runtime.sendMessage({
			action: 'fetchProxy', url, options: {},
		}) as { ok: boolean; status: number; text: string; error?: string };
		if (fetchResult?.error === 'CORS_PERMISSION_NEEDED') {
			await browser.permissions.request({ origins: ['<all_urls>'] });
			const retry = await browser.runtime.sendMessage({
				action: 'fetchProxy', url, options: {},
			}) as { ok: boolean; status: number; text: string; error?: string };
			if (!retry?.ok) throw new Error(retry?.error || 'Permission not granted');
			html = retry.text;
		} else if (!fetchResult?.ok) {
			throw new Error(fetchResult?.error || `HTTP ${fetchResult?.status}`);
		} else {
			html = fetchResult.text;
		}
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		// Set the base URL so relative URLs resolve correctly
		const base = doc.createElement('base');
		base.href = url;
		doc.head.prepend(base);

		const defuddled = new Defuddle(doc, { url }).parse();

		const title = defuddled.title || undefined;
		const site = defuddled.site || undefined;
		const favicon = defuddled.favicon || undefined;
		const content = defuddled.content || undefined;

		// Save title to highlights storage
		if (title) {
			const result = await browser.storage.local.get('highlights');
			const allHighlights = (result.highlights || {}) as Record<string, StoredData>;
			if (allHighlights[url]) {
				allHighlights[url].title = title;
				await browser.storage.local.set({ highlights: allHighlights });
			}
		}

		// Save site and favicon to domains storage
		if (site || favicon) {
			let hostname: string;
			try {
				hostname = new URL(url).hostname.replace(/^www\./, '');
			} catch {
				return { title, site, content };
			}
			const domResult = await browser.storage.local.get('domains');
			const domains = (domResult.domains || {}) as Record<string, DomainSettings>;
			if (!domains[hostname]) domains[hostname] = {};
			let changed = false;
			if (site && !domains[hostname].site) {
				domains[hostname].site = site;
				changed = true;
			}
			if (favicon && !domains[hostname].favicon) {
				try {
					domains[hostname].favicon = new URL(favicon, url).href;
				} catch {
					domains[hostname].favicon = favicon;
				}
				changed = true;
			}
			if (changed) {
				domainSettingsMap[hostname] = domains[hostname];
				await browser.storage.local.set({ domains });
				renderSidebar();
				createIcons({ icons });
			}
		}

		return { title, site, content };
	} catch (error) {
		console.error('Failed to fetch page:', url, error);
		return null;
	}
}


// --- Individual highlight items ---

function setButtonIcon(btn: HTMLElement, iconName: string) {
	btn.textContent = '';
	const icon = document.createElement('i');
	icon.setAttribute('data-lucide', iconName);
	btn.appendChild(icon);
	createIcons({ icons });
}

function unitKey(entries: HighlightEntry[]): string {
	return entries.map(e => e.data.id).join(',');
}

function createHighlightItem(entries: HighlightEntry[], pageUrl: string): HTMLElement {
	const item = document.createElement('div');
	item.className = 'highlight-item group/highlight rounded-lg bg-card p-4 text-card-foreground ring-1 ring-foreground/10';
	item.setAttribute('data-unit-key', unitKey(entries));

	const content = document.createElement('div');
	content.className = 'highlight-item-content text-sm leading-relaxed [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-3';

	const joined = entries.map(e => e.data.content || '').join('\n');
	content.replaceChildren(DOMPurify.sanitize(joined, { RETURN_DOM_FRAGMENT: true }));
	// A grouped selection may include stored <li> fragments; wrap consecutive
	// orphan <li>s in a <ul> so the list renders with its bullets intact.
	wrapOrphanListItems(content);
	if (searchQuery) highlightTextNodes(content, searchQuery);
	item.appendChild(content);

	const mergedNotes = entries.flatMap(e => e.data.notes ?? []);
	for (const note of mergedNotes) {
		const noteEl = document.createElement('div');
		noteEl.className = 'highlight-item-note mt-3 rounded-md bg-muted px-3 py-2 text-xs/relaxed text-muted-foreground';
		noteEl.textContent = note;
		item.appendChild(noteEl);
	}

	const footer = document.createElement('div');
	footer.className = 'highlight-item-actions-container mt-3 flex justify-end';

	const actions = document.createElement('div');
	actions.className = 'highlight-item-actions flex items-center gap-1 opacity-0 transition-opacity group-hover/highlight:opacity-100 focus-within:opacity-100';

	const copyBtn = document.createElement('button');
	copyBtn.className = 'highlight-action-btn flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3';
	copyBtn.title = getMessage('copyToClipboard');
	const copyIcon = document.createElement('i');
	copyIcon.setAttribute('data-lucide', 'copy');
	copyBtn.appendChild(copyIcon);
	copyBtn.addEventListener('click', async () => {
		const markdown = normalizeMarkdownOutput(entries.map(e => createMarkdownContent(e.data.content || '', pageUrl)).join('\n\n'));
		await navigator.clipboard.writeText(markdown);
		copyBtn.classList.add('is-copied');
		setButtonIcon(copyBtn, 'check');
		setTimeout(() => {
			copyBtn.classList.remove('is-copied');
			setButtonIcon(copyBtn, 'copy');
		}, 1500);
	});
	actions.appendChild(copyBtn);

	const deleteBtn = document.createElement('button');
	deleteBtn.className = 'highlight-action-btn flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3';
	deleteBtn.title = getMessage('delete');
	const deleteItemIcon = document.createElement('i');
	deleteItemIcon.setAttribute('data-lucide', 'trash-2');
	deleteBtn.appendChild(deleteItemIcon);
	deleteBtn.addEventListener('click', async () => {
		for (const e of entries) await deleteHighlight(pageUrl, e.data.id);
	});
	actions.appendChild(deleteBtn);

	footer.appendChild(actions);
	item.appendChild(footer);

	return item;
}

// Wrap consecutive orphan <li> elements (not already inside a <ul>/<ol>) in
// a <ul>. Used when rendering grouped highlights — stored <li> fragments
// don't carry their original list parent, so we synthesize one.
// TODO: always wraps in <ul>. Ordered list content (<ol>) loses its
// numbering. To fix, store the parent list type (ul vs ol) alongside each
// <li> highlight at creation time.
function wrapOrphanListItems(root: HTMLElement): void {
	const children = Array.from(root.children);
	let i = 0;
	while (i < children.length) {
		if (children[i].tagName === 'LI') {
			let j = i;
			while (j < children.length && children[j].tagName === 'LI') j++;
			const ul = document.createElement('ul');
			root.insertBefore(ul, children[i]);
			for (let k = i; k < j; k++) ul.appendChild(children[k]);
			i = j;
		} else {
			i++;
		}
	}
}

// --- Helpers ---

function highlightTextNodes(root: HTMLElement, query: string) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const matches: { node: Text; index: number; length: number }[] = [];
	const lowerQuery = query.toLowerCase();

	let node: Text | null;
	while ((node = walker.nextNode() as Text | null)) {
		const text = node.textContent || '';
		let idx = text.toLowerCase().indexOf(lowerQuery);
		while (idx !== -1) {
			matches.push({ node, index: idx, length: query.length });
			idx = text.toLowerCase().indexOf(lowerQuery, idx + query.length);
		}
	}

	// Process in reverse so indices stay valid
	for (let i = matches.length - 1; i >= 0; i--) {
		const { node: textNode, index, length } = matches[i];
		const after = textNode.splitText(index);
		const matched = after.splitText(length);
		const mark = document.createElement('mark');
		mark.className = 'search-match';
		mark.textContent = after.textContent;
		after.parentNode!.replaceChild(mark, after);
		// matched is already in the DOM after mark
		void matched;
	}
}

function displayDomain(domain: string): string {
	return domain.replace(/^www\./, '');
}

function siteNameOrDomain(domain: string): string {
	const normalized = domain.replace(/^www\./, '');
	return domainSettingsMap[normalized]?.site || normalized;
}

function displayPath(path: string): string {
	return decodeURIComponent(path).replace(/^\//, '');
}

// --- Storage mutations ---

async function deleteHighlight(url: string, highlightId: string) {
	const result = await browser.storage.local.get('highlights');
	const allHighlights = (result.highlights || {}) as Record<string, StoredData>;

	if (allHighlights[url]) {
		allHighlights[url].highlights = allHighlights[url].highlights.filter(h => h.id !== highlightId);
		if (allHighlights[url].highlights.length === 0) {
			delete allHighlights[url];
		}
		await browser.storage.local.set({ highlights: allHighlights });
	}
}

async function deleteHighlightsForUrl(url: string) {
	const result = await browser.storage.local.get('highlights');
	const allHighlights = (result.highlights || {}) as Record<string, StoredData>;
	delete allHighlights[url];
	await browser.storage.local.set({ highlights: allHighlights });
}

async function deleteHighlightsForDomain(group: DomainGroup) {
	const result = await browser.storage.local.get('highlights');
	const allHighlights = (result.highlights || {}) as Record<string, StoredData>;
	for (const page of group.pages) {
		delete allHighlights[page.url];
	}
	await browser.storage.local.set({ highlights: allHighlights });
}

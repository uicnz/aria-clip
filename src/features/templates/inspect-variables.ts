import { Template } from '../../types/types.js';
import { getMessage } from '../../platform/browser/i18n.js';
import { copyToClipboard } from '../../platform/browser/clipboard-utils.js';

type VariableGroup = 'page' | 'meta' | 'schema';

export interface InspectableVariable {
	variable: string;
	name: string;
	displayName: string;
	value: string;
	preview: string;
	searchText: string;
	group: VariableGroup;
}

const HIDDEN_VARIABLES = new Set(['content', 'contentHtml', 'fullHtml']);
const PREVIEW_LENGTH = 160;

let variablesPanel: HTMLElement | null = null;
let currentVariables: Record<string, string> = {};
let isPanelOpen = false;

function cleanVariableName(key: string): string {
	return key.replace(/^{{|}}$/g, '');
}

function groupForVariable(name: string): VariableGroup {
	if (name.startsWith('schema:')) return 'schema';
	if (name.startsWith('meta:')) return 'meta';
	return 'page';
}

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function isRedundantSchemaContainer(value: string): boolean {
	const parsed = parseJson(value);
	if (!parsed || typeof parsed !== 'object') return false;
	if (!Array.isArray(parsed)) return true;
	return parsed.some(item => item !== null && typeof item === 'object');
}

function formatPreview(value: string): string {
	const parsed = parseJson(value);
	const displayValue = Array.isArray(parsed) && parsed.every(item => item === null || typeof item !== 'object')
		? parsed.map(item => String(item)).join(', ')
		: value;
	const compact = displayValue.replace(/\s+/g, ' ').trim();
	if (!compact) return '—';
	return compact.length > PREVIEW_LENGTH
		? `${compact.slice(0, PREVIEW_LENGTH - 1)}…`
		: compact;
}

export function buildInspectableVariables(variables: Record<string, string>): InspectableVariable[] {
	return Object.entries(variables).flatMap(([variable, rawValue]) => {
		const name = cleanVariableName(variable);
		if (HIDDEN_VARIABLES.has(name)) return [];

		const value = String(rawValue ?? '');
		const group = groupForVariable(name);
		if (group === 'schema' && isRedundantSchemaContainer(value)) return [];

		const preview = formatPreview(value);
		return [{
			variable,
			name,
			displayName: group === 'schema' ? name.slice('schema:'.length) : name,
			value,
			preview,
			searchText: `${name} ${preview}`.toLowerCase(),
			group,
		}];
	});
}

function createVariableRow(item: InspectableVariable): HTMLButtonElement {
	const row = document.createElement('button');
	row.type = 'button';
	row.className = 'group/variable grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
	row.dataset.variable = item.variable;
	row.dataset.search = item.searchText;
	row.title = item.variable;

	const content = document.createElement('span');
	content.className = 'grid min-w-0 gap-0.5';

	const nameLine = document.createElement('span');
	nameLine.className = 'flex min-w-0 items-center gap-1.5';
	if (item.group === 'schema') {
		const badge = document.createElement('span');
		badge.className = 'inline-flex shrink-0 items-center rounded-md border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground';
		badge.textContent = 'schema';
		nameLine.appendChild(badge);
	}

	const variableName = document.createElement('code');
	variableName.className = 'min-w-0 truncate font-mono text-[11px] text-foreground';
	variableName.textContent = item.displayName;
	nameLine.appendChild(variableName);

	const value = document.createElement('span');
	value.className = 'block truncate text-[11px] text-muted-foreground';
	value.textContent = item.preview;

	const copyHint = document.createElement('span');
	copyHint.className = 'text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/variable:opacity-100';
	copyHint.textContent = getMessage('copyToClipboard');

	content.append(nameLine, value);
	row.append(content, copyHint);
	return row;
}

function groupLabel(group: VariableGroup): string {
	if (group === 'page') return getMessage('pageVariables');
	if (group === 'meta') return getMessage('meta');
	return 'Schema';
}

function createVariableGroup(group: VariableGroup, items: InspectableVariable[]): HTMLDetailsElement {
	const details = document.createElement('details');
	details.className = 'group border-b last:border-b-0';
	details.dataset.group = group;
	details.open = group === 'page';

	const summary = document.createElement('summary');
	summary.className = 'flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden';

	const label = document.createElement('span');
	label.className = 'flex-1';
	label.textContent = groupLabel(group);

	const count = document.createElement('span');
	count.className = 'text-xs font-normal text-muted-foreground';
	count.textContent = String(items.length);

	const chevron = document.createElement('span');
	chevron.className = 'text-lg leading-none text-muted-foreground transition-transform group-open:rotate-90';
	chevron.textContent = '›';

	summary.append(label, count, chevron);

	const itemList = document.createElement('div');
	itemList.className = 'grid gap-0.5 pb-2';
	items.forEach(item => itemList.appendChild(createVariableRow(item)));

	details.append(summary, itemList);
	return details;
}

function filterVariables(): void {
	if (!variablesPanel) return;
	const search = variablesPanel.querySelector<HTMLInputElement>('#variables-search');
	const term = search?.value.trim().toLowerCase() ?? '';
	const groups = variablesPanel.querySelectorAll<HTMLDetailsElement>('[data-group]');

	groups.forEach(group => {
		let visibleRows = 0;
		group.querySelectorAll<HTMLElement>('[data-variable]').forEach(row => {
			const visible = !term || row.dataset.search?.includes(term) === true;
			row.classList.toggle('hidden', !visible);
			if (visible) visibleRows++;
		});
		group.classList.toggle('hidden', visibleRows === 0);
		if (term && visibleRows > 0) group.open = true;
	});
}

function populateVariableList(): void {
	const list = variablesPanel?.querySelector<HTMLElement>('#variable-list');
	if (!list) return;

	const items = buildInspectableVariables(currentVariables);
	const fragment = document.createDocumentFragment();
	for (const group of ['page', 'meta', 'schema'] as const) {
		const groupItems = items.filter(item => item.group === group);
		if (groupItems.length > 0) fragment.appendChild(createVariableGroup(group, groupItems));
	}

	list.replaceChildren(fragment);
	filterVariables();
}

function setPanelOpen(open: boolean): void {
	if (!variablesPanel) return;
	const trigger = document.getElementById('show-variables');
	variablesPanel.classList.toggle('show', open);
	variablesPanel.setAttribute('aria-hidden', String(!open));
	trigger?.setAttribute('aria-expanded', String(open));
	isPanelOpen = open;

	if (open) {
		requestAnimationFrame(() => variablesPanel?.querySelector<HTMLInputElement>('#variables-search')?.focus());
	}
}

function closeVariablesPanel(): void {
	setPanelOpen(false);
}

async function handleVariableClick(event: Event): Promise<void> {
	const row = (event.target as HTMLElement).closest<HTMLElement>('[data-variable]');
	if (!row) return;
	const variable = row.dataset.variable;
	if (!variable) return;

	const copied = await copyToClipboard(variable);
	if (!copied) return;

	const status = variablesPanel?.querySelector<HTMLElement>('#variables-status');
	if (status) status.textContent = `${getMessage('copied')} ${variable}`;
	row.classList.add('bg-accent');
	setTimeout(() => row.classList.remove('bg-accent'), 800);
}

export function initializeVariablesPanel(panel: HTMLElement, _template: Template | null, variables: Record<string, string>): void {
	variablesPanel = panel;
	currentVariables = variables;
	if (panel.dataset.initialized === 'true') return;

	panel.dataset.initialized = 'true';
	panel.querySelector('#close-variables')?.addEventListener('click', closeVariablesPanel);
	panel.querySelector('#variables-search')?.addEventListener('input', filterVariables);
	panel.querySelector('#variable-list')?.addEventListener('click', event => void handleVariableClick(event));
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && isPanelOpen) closeVariablesPanel();
	});
}

export function updateVariablesPanel(_template: Template | null, variables: Record<string, string>): void {
	currentVariables = variables;
	if (isPanelOpen) populateVariableList();
}

export function showVariables(): void {
	if (!variablesPanel) {
		console.error('variablesPanel is not initialized');
		return;
	}

	populateVariableList();
	setPanelOpen(true);
}

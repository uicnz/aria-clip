import type { Template, ValueKind } from '../../types/types.js';
import { TemplateImportSchema, TemplateSchema, type TemplateImport } from '../../schemas/template.js';
import { ChunksSchema, IdsSchema, StoreSchema, type Store } from '../../schemas/store.js';
import { templates, saveTemplateSettings, editingTemplateIndex, loadTemplates } from '../templates/template-manager.js';
import { showTemplateEditor, updateTemplateList } from '../templates/template-ui.js';
import { sanitizeFilename } from '../../core/artifacts/filename.js';
import { generalSettings, loadSettings } from '../../platform/browser/storage-utils.js';
import { addPropertyType, updatePropertyTypesList } from '../templates/property-types-manager.js';
import { hideModal } from '../../shared/dom/modal-utils.js';
import { showImportModal } from './import-modal.js';
import browser from '../../platform/browser/browser-polyfill.js';
import { saveFile } from '../../platform/browser/file-utils.js';
import { copyToClipboard } from '../../platform/browser/clipboard-utils.js';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { getMessage } from '../../platform/browser/i18n.js';

const SCHEMA_VERSION = '0.1.0';

function newId(): string {
	return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function fileFrom(template: Template): TemplateImport {
	const daily = template.behavior === 'append-daily' || template.behavior === 'prepend-daily';
	const properties = template.properties.map(({ name, value, type }) => ({
		name,
		value,
		type: type ?? generalSettings.propertyTypes.find(item => item.name === name)?.type ?? 'text',
	}));

	return TemplateImportSchema.parse({
		schemaVersion: SCHEMA_VERSION,
		name: template.name,
		behavior: template.behavior,
		noteContentFormat: template.noteContentFormat,
		properties,
		triggers: template.triggers,
		artifactType: template.artifactType,
		noteNameFormat: daily ? undefined : template.noteNameFormat,
		path: daily ? undefined : template.path,
		context: template.context || undefined,
	});
}

export async function exportTemplate(): Promise<void> {
	if (editingTemplateIndex === -1) {
		alert(getMessage('selectTemplateToExport'));
		return;
	}

	const template = templates[editingTemplateIndex];
	if (!template) return;
	const sanitizedName = sanitizeFilename(template.name);
	const fileName = `${sanitizedName}-clip.json`;
	const content = JSON.stringify(fileFrom(template), null, '\t');
	
	await saveFile({
		content,
		fileName,
		mimeType: 'application/json',
		onError: (error) => console.error('Failed to export template:', error)
	});
}

export function importTemplate(input?: HTMLInputElement): void {
	if (!input) {
		input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
	}

	if (input.files && input.files.length > 0) {
		importTemplateFile(input.files[0]);
	} else {
		input.onchange = (event: Event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (file) {
				importTemplateFile(file);
			}
		};
		input.click();
	}
}

function preventDefaults(e: Event): void {
	e.preventDefault();
	e.stopPropagation();
}

function handleDrop(e: DragEvent): void {
	const dt = e.dataTransfer;
	const files = dt?.files;

	if (files && files.length) {
		handleFiles(files);
	}
}
void preventDefaults;
void handleDrop;

function handleFiles(files: FileList): void {
	Array.from(files).forEach(importTemplateFile);
}

async function processImportedTemplate(input: TemplateImport): Promise<Template> {
	const properties = [];
	for (const prop of input.properties) {
		const existing = generalSettings.propertyTypes.find(item => item.name === prop.name);
		const type: ValueKind = existing?.type ?? prop.type ?? 'text';
		if (!existing) {
			await addPropertyType(prop.name, type, prop.value);
		}
		properties.push({
			id: prop.id ?? newId(),
			name: prop.name,
			value: prop.value,
			type,
		});
	}

	let newName = input.name;
	let counter = 1;
	while (templates.some(t => t.name === newName)) {
		newName = `${input.name} (${counter++})`;
	}

	return TemplateSchema.parse({
		id: newId(),
		name: newName,
		behavior: input.behavior,
		noteNameFormat: input.noteNameFormat ?? '',
		path: input.path ?? '',
		noteContentFormat: input.noteContentFormat,
		properties,
		triggers: input.triggers,
		vault: input.vault,
		context: input.context,
		artifactType: input.artifactType,
	});
}

export function importTemplateFile(file: File): void {
	void file.text().then(async (content) => {
		try {
			const imported = TemplateImportSchema.parse(JSON.parse(content));
			const processedTemplate = await processImportedTemplate(imported);
			
			templates.unshift(processedTemplate);
			await saveTemplateSettings();
			updateTemplateList();
			showTemplateEditor(processedTemplate);
			hideModal(document.getElementById('import-modal'));
		} catch (error) {
			console.error('Error parsing imported template:', error);
			alert(getMessage('failedToImportTemplate'));
		}
	});
}

export function showTemplateImportModal(): void {
	showImportModal(
		'import-modal',
		importTemplateFromJson,
		'.json',
		true,
		'importTemplate'
	);
}

async function importTemplateFromJson(jsonContent: string): Promise<void> {
	try {
		const imported = TemplateImportSchema.parse(JSON.parse(jsonContent));
		const processedTemplate = await processImportedTemplate(imported);
		
		templates.unshift(processedTemplate);
		await saveTemplateSettings();
		updateTemplateList();
		showTemplateEditor(processedTemplate);
	} catch (error) {
		console.error('Error parsing imported template:', error);
		throw new Error('Error importing template. Please check the file and try again.');
	}
}

export function copyTemplateToClipboard(template: Template): void {
	const jsonContent = JSON.stringify(fileFrom(template), null, 2);
	
	copyToClipboard(
		jsonContent
	).then(success => {
		if (success) {
			alert(getMessage('templateCopied'));
		} else {
			alert(getMessage('templateCopyError'));
		}
	});
}

export async function exportAllSettings(): Promise<void> {
	console.log('Starting exportAllSettings function');
	try {
		console.log('Fetching all data from browser storage');
		const allData = StoreSchema.parse(await browser.storage.sync.get(null));
		console.log('All data fetched:', allData);

		// Create a copy of the data to modify
		const exportData: Store = { ...allData };

		// Decompress all templates
		const templateIds = IdsSchema.catch([]).parse(exportData.template_list);
		for (const id of templateIds) {
			const key = `template_${id}`;
			const chunks = ChunksSchema.safeParse(exportData[key]);
			if (chunks.success) {
				try {
					// Join chunks and decompress
					const compressedData = chunks.data.join('');
					const decompressedData = decompressFromUTF16(compressedData);
					exportData[key] = TemplateSchema.parse(JSON.parse(decompressedData));
				} catch (error) {
					console.error(`Failed to decompress template ${id}:`, error);
				}
			}
		}

		console.log('Data prepared for export:', exportData);
		const content = JSON.stringify(exportData, null, 2);
		console.log('Data stringified, length:', content.length);

		const fileName = 'aria-clip-settings.json';

		await saveFile({
			content,
			fileName,
			mimeType: 'application/json',
			onError: (error) => console.error('Failed to export settings:', error)
		});

		console.log('Export completed successfully');
	} catch (error) {
		console.error('Error in exportAllSettings:', error);
		alert(getMessage('failedToExportSettings'));
	}
}

export function importAllSettings(): void {
	showImportModal(
		'import-modal',
		importAllSettingsFromJson,
		'.json',
		false,
		'importAllSettings'
	);
}

async function importAllSettingsFromJson(jsonContent: string): Promise<void> {
	try {
		const settings = StoreSchema.parse(JSON.parse(jsonContent));
		
		if (confirm(getMessage('confirmReplaceSettings'))) {
			// Create a copy of the settings to modify
			const importData: Store = { ...settings };
			
			// Compress all templates
			const templateIds = IdsSchema.catch([]).parse(importData.template_list);
			for (const id of templateIds) {
				const key = `template_${id}`;
				const value = importData[key];
				if (value !== undefined) {
					try {
						// Check if the data is already compressed (will be an array of strings)
						const chunks = ChunksSchema.safeParse(value);

						if (!chunks.success) {
							// Compress the template data
							const templateStr = JSON.stringify(TemplateSchema.parse(value));
							const compressedData = compressToUTF16(templateStr);
							
							// Split into chunks
							const chunks: string[] = [];
							const CHUNK_SIZE = 8000;
							for (let i = 0; i < compressedData.length; i += CHUNK_SIZE) {
								chunks.push(compressedData.slice(i, i + CHUNK_SIZE));
							}
							importData[key] = chunks;
						}
					} catch (error) {
						console.error(`Failed to process template ${id}:`, error);
					}
				}
			}

			await browser.storage.sync.clear();
			await browser.storage.sync.set(importData);
			await loadSettings();
			await loadTemplates();
			updateTemplateList();
			updatePropertyTypesList();
			alert(getMessage('settingsImportSuccess'));
		}
	} catch (error) {
		console.error('Error importing all settings:', error);
		throw new Error('Error importing settings. Please check the file and try again.');
	}
}

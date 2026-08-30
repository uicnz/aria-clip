import { Template } from '../../types/types.js';
import { deleteTemplate, templates, editingTemplateIndex, saveTemplateSettings, setEditingTemplateIndex, loadTemplates } from './template-manager.js';
import { initializeIcons } from '../../icons/icons.js';
import { escapeValue, unescapeValue } from '../../shared/text/string-utils.js';
import { generalSettings } from '../../platform/browser/storage-utils.js';
import { updateUrl } from '../settings/routing.js';
import { createElementWithClass, createElementWithHTML } from '../../shared/dom/dom-utils.js';
import { updatePromptContextVisibility } from '../interpreter/interpreter-settings.js';
import { showSettingsSection } from '../settings/settings-section-ui.js';
import { updatePropertyType } from './property-types-manager.js';
import { getMessage } from '../../platform/browser/i18n.js';
import { parse, validateVariables, validateFilters } from './engine/parser.js';
import { renderTemplateList } from '../../components/settings/template-list.js';
import { renderTemplateProperties, type TemplatePropertyRow } from '../../components/settings/template-properties.js';
import { isValidArtifactType } from '../../core/artifacts/artifact.js';
let hasUnsavedChanges = false;
void hasUnsavedChanges;

export function resetUnsavedChanges(): void {
	hasUnsavedChanges = false;
}

export function updateTemplateList(loadedTemplates?: Template[]): void {
	const templateList = document.getElementById('template-list');
	if (!templateList) {
		console.error('Template list element not found');
		return;
	}
	
	const templatesToUse = loadedTemplates || templates;
	
	// Filter out null or undefined templates
	const validTemplates = templatesToUse.filter((template): template is Template => 
		template != null && typeof template === 'object' && 'id' in template && 'name' in template
	);

	renderTemplateList(templateList, validTemplates, editingTemplateIndex, showTemplateEditor, deleteTemplateFromList);

	// If any invalid templates were found and removed, save the changes
	if (validTemplates.length !== templatesToUse.length) {
		saveTemplateSettings();
	}

}

// Rename this function to make it clear it's for deleting from the list
async function deleteTemplateFromList(templateId: string): Promise<void> {
	const template = templates.find(t => t.id === templateId);
	if (!template) {
		console.error('Template not found:', templateId);
		return;
	}

	if (confirm(getMessage('confirmDeleteTemplate', [template.name]))) {
		const success = await deleteTemplate(templateId);
		if (success) {
			const updatedTemplates = await loadTemplates();
			updateTemplateList(updatedTemplates);
			if (updatedTemplates.length > 0) {
				showTemplateEditor(updatedTemplates[0]);
			} else {
				showSettingsSection('general');
			}
		} else {
			alert(getMessage('failedToDeleteTemplate'));
		}
	}
}

export function showTemplateEditor(template: Template | null): void {
	let editingTemplate: Template;

	if (!template) {
		const newTemplateName = getUniqueTemplateName(getMessage('newTemplate'));
		editingTemplate = {
			id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
			name: newTemplateName,
			behavior: 'create',
			noteNameFormat: '{{title}}',
			path: 'Clips',
			noteContentFormat: '{{content}}',
			properties: [],
			triggers: [],
			context: ''
		};
		templates.unshift(editingTemplate);
		setEditingTemplateIndex(0);
		saveTemplateSettings().then(() => {
			updateTemplateList();
		}).catch(error => {
			console.error('Failed to save new template:', error);
		});
	} else {
		editingTemplate = template;
		setEditingTemplateIndex(templates.findIndex(t => t.id === editingTemplate.id));
	}

	// Ensure properties is always an array
	if (!editingTemplate.properties) {
		editingTemplate.properties = [];
	}

	const templateEditorTitle = document.getElementById('template-editor-title');
	const templateName = document.getElementById('template-name') as HTMLInputElement;
	const templateProperties = document.getElementById('template-properties');

	if (templateEditorTitle) templateEditorTitle.textContent = getMessage('editTemplate');
	if (templateName) templateName.value = editingTemplate.name;
	const artifactTypeInput = document.getElementById('artifact-type') as HTMLInputElement;
	if (artifactTypeInput) artifactTypeInput.value = editingTemplate.artifactType || '';

	const pathInput = document.getElementById('template-path-name') as HTMLInputElement;
	if (pathInput) {
		pathInput.value = editingTemplate.path || '';
		validateTemplateField(pathInput, false);
	}

	const behaviorSelect = document.getElementById('template-behavior') as HTMLSelectElement;
	if (behaviorSelect) behaviorSelect.value = editingTemplate.behavior || 'create';

	const noteNameFormat = document.getElementById('note-name-format') as HTMLInputElement;
	if (noteNameFormat) {
		noteNameFormat.value = editingTemplate.noteNameFormat || '{{title}}';
		validateTemplateField(noteNameFormat, false);
	}

	const noteContentFormat = document.getElementById('note-content-format') as HTMLTextAreaElement;
	if (noteContentFormat) {
		noteContentFormat.value = editingTemplate.noteContentFormat || '';
		validateTemplateField(noteContentFormat, true);
	}

	const promptContextTextarea = document.getElementById('prompt-context') as HTMLTextAreaElement;
	if (promptContextTextarea) {
		promptContextTextarea.value = editingTemplate.context || '';
		validateTemplateField(promptContextTextarea, true);
	}

	updateBehaviorFields();

	if (behaviorSelect) {
		behaviorSelect.addEventListener('change', updateBehaviorFields);
	}

	refreshPropertyNameSuggestions();

	if (templateProperties && editingTemplate && Array.isArray(editingTemplate.properties)) {
		renderTemplateProperties(templateProperties, {
			initialRows: editingTemplate.properties.map((property) => ({
				id: property.id || `${Date.now()}${Math.random().toString(36).slice(2, 11)}`,
				name: property.name,
				value: unescapeValue(property.value),
				type: (property.type || generalSettings.propertyTypes.find(item => item.name === property.name)?.type || 'text') as TemplatePropertyRow['type']
			})),
			propertyTypes: generalSettings.propertyTypes,
			typeLabels: {
				text: getMessage('propertyTypeText'),
				multitext: getMessage('propertyTypeMultitext'),
				number: getMessage('propertyTypeNumber'),
				checkbox: getMessage('propertyTypeCheckbox'),
				date: getMessage('propertyTypeDate'),
				datetime: getMessage('propertyTypeDatetime')
			},
			labels: {
				propertyName: getMessage('propertyName'),
				propertyValue: getMessage('propertyValue'),
				propertyType: getMessage('propertyType'),
				removeProperty: getMessage('removeProperty')
			},
			onTypeChange: (name, type) => { void updatePropertyType(name, type) },
			onValidate: (input, container) => validateTemplateField(input, false, container)
		});
	}

	const triggersTextarea = document.getElementById('triggers') as HTMLTextAreaElement;
	if (triggersTextarea) triggersTextarea.value = editingTemplate && editingTemplate.triggers ? editingTemplate.triggers.join('\n') : '';

	showSettingsSection('templates', editingTemplate.id);

	if (!editingTemplate.id) {
		const templateNameField = document.getElementById('template-name') as HTMLInputElement;
		if (templateNameField) {
			templateNameField.focus();
			templateNameField.select();
		}
	}

	resetUnsavedChanges();

	if (templateName) {
		templateName.addEventListener('input', () => {
			if (editingTemplateIndex !== -1 && templates[editingTemplateIndex]) {
				templates[editingTemplateIndex].name = templateName.value;
				updateTemplateList();
			}
		});
	}

	const vaultSelect = document.getElementById('template-vault') as HTMLSelectElement;
	if (vaultSelect) {
		// Clear existing vault options
		vaultSelect.textContent = '';
		const lastUsedOption = document.createElement('option');
		lastUsedOption.value = '';
		lastUsedOption.textContent = getMessage('lastUsed');
		vaultSelect.appendChild(lastUsedOption);
		generalSettings.vaults.forEach(vault => {
			const option = document.createElement('option');
			option.value = vault;
			option.textContent = vault;
			vaultSelect.appendChild(option);
		});
		vaultSelect.value = editingTemplate.vault || '';
	}

	updateUrl('templates', editingTemplate.id);
	updatePromptContextVisibility();
}

function updateBehaviorFields(): void {
	const behaviorSelect = document.getElementById('template-behavior') as HTMLSelectElement;
	const noteNameFormatContainer = document.getElementById('note-name-format-container');
	const pathContainer = document.getElementById('path-name-container');
	const noteNameFormat = document.getElementById('note-name-format') as HTMLInputElement;

	if (behaviorSelect) {
		const selectedBehavior = behaviorSelect.value;
		const isDailyNote = selectedBehavior === 'append-daily' || selectedBehavior === 'prepend-daily';

		if (noteNameFormatContainer) noteNameFormatContainer.style.display = isDailyNote ? 'none' : 'block';
		if (pathContainer) pathContainer.style.display = isDailyNote ? 'none' : 'block';

		if (noteNameFormat) {
			noteNameFormat.required = !isDailyNote;
			switch (selectedBehavior) {
				case 'append-specific':
				case 'prepend-specific':
				case 'overwrite':
					noteNameFormat.placeholder = getMessage('specificNoteName');
					break;
				case 'append-daily':
				case 'prepend-daily':
					noteNameFormat.placeholder = getMessage('dailyNoteFormat');
					break;
				default:
					noteNameFormat.placeholder = getMessage('noteNameFormat');
			}
		}
	}
}

export function updateTemplateFromForm(): void {
	if (editingTemplateIndex === -1) return;

	const template = templates[editingTemplateIndex];
	if (!template) {
		console.error('Template not found');
		return;
	}

	const behaviorSelect = document.getElementById('template-behavior') as HTMLSelectElement;
	if (behaviorSelect) template.behavior = behaviorSelect.value as Template['behavior'];

	const artifactTypeInput = document.getElementById('artifact-type') as HTMLInputElement;
	if (artifactTypeInput) {
		const artifactType = artifactTypeInput.value.trim();
		if (!artifactType) {
			template.artifactType = undefined;
		} else if (isValidArtifactType(artifactType)) {
			template.artifactType = artifactType;
		}
	}

	const isDailyNote = template.behavior === 'append-daily' || template.behavior === 'prepend-daily';

	const pathInput = document.getElementById('template-path-name') as HTMLInputElement;
	if (pathInput) template.path = pathInput.value;

	const noteNameFormat = document.getElementById('note-name-format') as HTMLInputElement;
	if (noteNameFormat) {
		if (!isDailyNote && noteNameFormat.value.trim() === '') {
			console.error('Note name format is required for non-daily note behaviors');
			noteNameFormat.setCustomValidity(getMessage('noteNameRequired'));
			noteNameFormat.reportValidity();
			return;
		} else {
			noteNameFormat.setCustomValidity('');
			template.noteNameFormat = noteNameFormat.value;
		}
	}

	const noteContentFormat = document.getElementById('note-content-format') as HTMLTextAreaElement;
	if (noteContentFormat) template.noteContentFormat = noteContentFormat.value;

	const promptContextTextarea = document.getElementById('prompt-context') as HTMLTextAreaElement;
	if (promptContextTextarea) template.context = promptContextTextarea.value;

	const propertyElements = document.querySelectorAll('#template-properties .property-editor');
	template.properties = Array.from(propertyElements).map(prop => {
		const nameInput = prop.querySelector('.property-name') as HTMLInputElement;
		const valueInput = prop.querySelector('.property-value') as HTMLInputElement;
		return {
			id: (prop as HTMLElement).dataset.id || Date.now().toString() + Math.random().toString(36).slice(2, 11),
			name: nameInput.value,
			value: escapeValue(valueInput.value),
			type: (prop as HTMLElement).dataset.type || 'text'
		};
	}).filter(prop => prop.name.trim() !== ''); // Filter out properties with empty names

	const triggersTextarea = document.getElementById('triggers') as HTMLTextAreaElement;
	if (triggersTextarea) template.triggers = triggersTextarea.value.split('\n').filter(Boolean);

	const vaultSelect = document.getElementById('template-vault') as HTMLSelectElement;
	if (vaultSelect) template.vault = vaultSelect.value || undefined;

	hasUnsavedChanges = true;
}

function clearTemplateEditor(): void {
	setEditingTemplateIndex(-1);
	const templateEditorTitle = document.getElementById('template-editor-title');
	const templateName = document.getElementById('template-name') as HTMLInputElement;
	const templateProperties = document.getElementById('template-properties');
	if (templateEditorTitle) templateEditorTitle.textContent = getMessage('newTemplate');
	if (templateName) templateName.value = '';
	if (templateProperties) {
		renderTemplateProperties(templateProperties, {
			initialRows: [],
			propertyTypes: generalSettings.propertyTypes,
			typeLabels: {
				text: getMessage('propertyTypeText'), multitext: getMessage('propertyTypeMultitext'), number: getMessage('propertyTypeNumber'),
				checkbox: getMessage('propertyTypeCheckbox'), date: getMessage('propertyTypeDate'), datetime: getMessage('propertyTypeDatetime')
			},
			labels: { propertyName: getMessage('propertyName'), propertyValue: getMessage('propertyValue'), propertyType: getMessage('propertyType'), removeProperty: getMessage('removeProperty') },
			onTypeChange: (name, type) => { void updatePropertyType(name, type) },
			onValidate: (input, container) => validateTemplateField(input, false, container)
		});
	}
	const pathInput = document.getElementById('template-path-name') as HTMLInputElement;
	if (pathInput) pathInput.value = 'Clips';
	const artifactTypeInput = document.getElementById('artifact-type') as HTMLInputElement;
	if (artifactTypeInput) artifactTypeInput.value = '';
	const triggersTextarea = document.getElementById('triggers') as HTMLTextAreaElement;
	if (triggersTextarea) triggersTextarea.value = '';
	const templateEditor = document.getElementById('template-editor');
	if (templateEditor) templateEditor.style.display = 'none';
}
void clearTemplateEditor;

export function initializeAddPropertyButton(): void {
	const addPropertyBtn = document.getElementById('add-property-btn');
	if (addPropertyBtn) {
		addPropertyBtn.removeEventListener('click', handleAddProperty);
		addPropertyBtn.addEventListener('click', handleAddProperty);
	} else {
		console.error('Add property button not found');
	}
}

function handleAddProperty(): void {
	window.dispatchEvent(new Event('aria-add-template-property'));
}

function getUniqueTemplateName(baseName: string): string {
	const existingNames = new Set(templates.map(t => t.name));
	let newName = baseName;
	let counter = 1;

	while (existingNames.has(newName)) {
		newName = `${baseName} ${counter}`;
		counter++;
	}

	return newName;
}

function updatePropertyNameSuggestions(): void {
	const datalist = document.getElementById('property-name-suggestions');
	if (datalist) {
		// Clear existing suggestions
		datalist.textContent = '';
		generalSettings.propertyTypes.forEach(pt => {
			const option = document.createElement('option');
			option.value = pt.name;
			datalist.appendChild(option);
		});
	}
}

export function refreshPropertyNameSuggestions(): void {
	updatePropertyNameSuggestions();
}

/**
 * Update the error summary at the top of the template editor.
 */
function updateErrorSummary(): void {
	const templateEditor = document.getElementById('template-editor');
	if (!templateEditor) return;

	// Find or create the summary element
	let summaryEl = document.getElementById('template-error-summary');
	if (!summaryEl) {
		summaryEl = createElementWithClass('div', 'template-error-summary');
		summaryEl.id = 'template-error-summary';
		templateEditor.insertBefore(summaryEl, templateEditor.firstChild);
	}

	// Count errors from all validation elements
	const validationEls = document.querySelectorAll('.template-validation.invalid');
	let totalErrors = 0;
	validationEls.forEach(el => {
		const errorItems = el.querySelectorAll('.validation-error');
		totalErrors += errorItems.length;
	});

	// Clear and update summary
	summaryEl.textContent = '';
	summaryEl.className = 'template-error-summary';

	if (totalErrors === 0) {
		summaryEl.style.display = 'none';
		return;
	}

	summaryEl.classList.add('has-errors');
	const icon = createElementWithHTML('i', '', { 'data-lucide': 'alert-triangle' });
	summaryEl.appendChild(icon);

	const text = document.createElement('span');
	const messageKey = totalErrors === 1 ? 'templateErrorCount' : 'templateErrorsCount';
	text.textContent = getMessage(messageKey, totalErrors.toString());
	summaryEl.appendChild(text);

	summaryEl.style.display = 'flex';
	initializeIcons(summaryEl);
}

/**
 * Validate a template field and display results.
 * @param field The input or textarea element to validate
 * @param showLineNumbers Whether to show line numbers in error messages (for multiline fields)
 * @param appendTo Optional element to append the validation to (defaults to inserting after the field)
 */
function validateTemplateField(field: HTMLInputElement | HTMLTextAreaElement, showLineNumbers: boolean = false, appendTo?: HTMLElement): void {
	const content = field.value;
	const validationId = `${field.id}-validation`;

	// Find or create the validation result element
	let validationEl = document.getElementById(validationId);
	if (!validationEl) {
		validationEl = createElementWithClass('div', 'template-validation');
		validationEl.id = validationId;
		if (appendTo) {
			appendTo.appendChild(validationEl);
		} else {
			field.parentNode?.insertBefore(validationEl, field.nextSibling);
		}
	}

	// Clear previous content
	validationEl.textContent = '';
	validationEl.className = 'template-validation';

	// Skip validation for empty content
	if (!content.trim()) {
		validationEl.style.display = 'none';
		updateErrorSummary();
		return;
	}

	// Parse and check for errors
	const result = parse(content);

	// Validate variable names and filter usage
	const variableWarnings = validateVariables(result.ast);
	const filterWarnings = validateFilters(result.ast);

	// Combine errors and warnings into a single list
	const issues: { line: number; message: string; isError: boolean }[] = [
		...result.errors.map(e => ({ line: e.line || 0, message: e.message, isError: true })),
		...variableWarnings.map(w => ({ line: w.line || 0, message: w.message, isError: false })),
		...filterWarnings.map(w => ({ line: w.line || 0, message: w.message, isError: false })),
	].sort((a, b) => a.line - b.line);

	const hasErrors = result.errors.length > 0;
	const hasWarnings = variableWarnings.length > 0 || filterWarnings.length > 0;

	if (!hasErrors && !hasWarnings) {
		// Valid template - show nothing
		validationEl.style.display = 'none';
		updateErrorSummary();
		return;
	} else {
		// Has errors and/or warnings - use error styling if any errors, warning styling if only warnings
		validationEl.classList.add(hasErrors ? 'invalid' : 'warning');
		const icon = createElementWithHTML('i', '', { 'data-lucide': 'alert-triangle' });
		validationEl.appendChild(icon);

		const issueList = document.createElement('div');
		issueList.className = 'validation-errors';

		issues.forEach(issue => {
			const issueItem = document.createElement('div');
			issueItem.className = issue.isError ? 'validation-error' : 'validation-warning';
			const location = showLineNumbers && issue.line ? `Line ${issue.line}: ` : '';
			issueItem.textContent = `${location}${issue.message}`;
			issueList.appendChild(issueItem);
		});

		validationEl.appendChild(issueList);
		initializeIcons(validationEl);
	}

	validationEl.style.display = 'flex';
	updateErrorSummary();
}

/**
 * Add validation listener to a template field.
 */
function addValidationListener(field: HTMLInputElement | HTMLTextAreaElement | null, showLineNumbers: boolean = false): void {
	if (field) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		field.addEventListener('input', () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => validateTemplateField(field, showLineNumbers), 180);
		});
		field.addEventListener('blur', () => validateTemplateField(field, showLineNumbers));
	}
}

/**
 * Initialize template validation on all template fields.
 */
export function initializeTemplateValidation(): void {
	// Note content (multiline, show line numbers)
	const noteContentFormat = document.getElementById('note-content-format') as HTMLTextAreaElement;
	addValidationListener(noteContentFormat, true);

	// Note name format (single line)
	const noteNameFormat = document.getElementById('note-name-format') as HTMLInputElement;
	addValidationListener(noteNameFormat, false);

	// Path/folder (single line)
	const pathInput = document.getElementById('template-path-name') as HTMLInputElement;
	addValidationListener(pathInput, false);

	// Prompt context (multiline, show line numbers)
	const promptContext = document.getElementById('prompt-context') as HTMLTextAreaElement;
	addValidationListener(promptContext, true);

	const properties = document.getElementById('template-properties');
	if (properties && properties.dataset.validationInitialized !== 'true') {
		properties.dataset.validationInitialized = 'true';
		const timers = new WeakMap<HTMLInputElement, ReturnType<typeof setTimeout>>();
		properties.addEventListener('input', event => {
			const field = event.target;
			if (!(field instanceof HTMLInputElement) || !field.classList.contains('property-value')) return;
			const existing = timers.get(field);
			if (existing) clearTimeout(existing);
			timers.set(field, setTimeout(() => {
				const container = field.closest('.property-editor');
				validateTemplateField(field, false, container instanceof HTMLElement ? container : undefined);
			}, 180));
		});
	}
}

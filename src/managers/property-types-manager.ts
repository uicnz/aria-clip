import { PropertyType } from '../types/types.js';
import { generalSettings, saveSettings } from '../utils/storage-utils.js';
import { templates } from './template-manager.js';
import { refreshPropertyNameSuggestions } from './template-ui.js';
import { unescapeValue } from '../utils/string-utils.js';
import { showImportModal } from '../utils/import-modal.js';
import { saveFile } from '../utils/file-utils.js';
import { getMessage } from '../utils/i18n.js';
import { renderPropertyTypeList } from '../components/settings/property-type-list.js';

export function initializePropertyTypesManager(): void {
	ensureTagsProperty();
	updatePropertyTypesList();
	setupAddPropertyTypeButton();
	setupImportExportButtons();
	setupDeleteUnusedPropertiesButton();
}

function ensureTagsProperty(): void {
	const tagsProperty = generalSettings.propertyTypes.find(pt => pt.name === 'tags');
	if (!tagsProperty) {
		addPropertyType('tags', 'multitext', '');
	} else if (tagsProperty.type !== 'multitext') {
		updatePropertyType('tags', 'multitext', tagsProperty.defaultValue || '');
	}
}

export function updatePropertyTypesList(): void {
	const propertyTypesList = document.getElementById('property-types-list');
	const deleteUnusedButton = document.getElementById('delete-unused-properties-btn');
	if (!propertyTypesList || !deleteUnusedButton) return;

	const propertyUsageCounts = countPropertyUsage();

	// Sort all property types alphabetically
	const sortedPropertyTypes = [...generalSettings.propertyTypes].sort((a, b) => 
		a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
	);

	const usedProperties = new Set<string>();
	templates.forEach(template => {
		template.properties.forEach(property => {
			usedProperties.add(property.name);
		});
	});

	let hasUnusedProperties = false;

	const rows = sortedPropertyTypes.map(propertyType => {
		const isUsed = usedProperties.has(propertyType.name);
		if (!isUsed && propertyType.name !== 'tags') {
			hasUnusedProperties = true;
		}
		return {
			propertyType: {
				...propertyType,
				defaultValue: unescapeValue(propertyType.defaultValue || '')
			},
			usageCount: propertyUsageCounts[propertyType.name] || 0
		};
	});

	renderPropertyTypeList(propertyTypesList, rows, {
		changeType: (propertyType, type) => {
			void updatePropertyType(propertyType.name, type, propertyType.defaultValue || '').then(updatePropertyTypesList);
		},
		changeDefaultValue: (propertyType, value) => {
			void updatePropertyType(propertyType.name, propertyType.type, value).then(updatePropertyTypesList);
		},
		remove: (propertyType) => removePropertyType(propertyType.name),
		typeLabels: {
			text: getMessage('propertyTypeText'),
			multitext: getMessage('propertyTypeMultitext'),
			number: getMessage('propertyTypeNumber'),
			checkbox: getMessage('propertyTypeCheckbox'),
			date: getMessage('propertyTypeDate'),
			datetime: getMessage('propertyTypeDatetime')
		}
	});

	// Show or hide the "Remove unused" button
	const deleteUnusedButtonContainer = deleteUnusedButton.closest('.setting-item');
	if (deleteUnusedButtonContainer instanceof HTMLElement) {
		deleteUnusedButtonContainer.style.display = hasUnusedProperties ? 'flex' : 'none';
	}

	refreshPropertyNameSuggestions();
}

function countPropertyUsage(): Record<string, number> {
	const usageCounts: Record<string, number> = {};
	templates.forEach(template => {
		template.properties.forEach(property => {
			usageCounts[property.name] = (usageCounts[property.name] || 0) + 1;
		});
	});
	return usageCounts;
}

function setupAddPropertyTypeButton(): void {
	const addButton = document.getElementById('add-property-type-btn');
	if (addButton) {
		addButton.addEventListener('click', () => {
			const name = prompt('Enter the name for the new property type:');
			if (name) {
				addPropertyType(name).then(updatePropertyTypesList);
			}
		});
	}
}

function setupImportExportButtons(): void {
	const importButton = document.getElementById('import-types-btn');
	const exportButton = document.getElementById('export-types-btn');

	if (importButton) {
		importButton.addEventListener('click', showTypesImportModal);
	}

	if (exportButton) {
		exportButton.addEventListener('click', exportTypesJson);
	}
}

function showTypesImportModal(): void {
	showImportModal(
		'import-modal',
		importTypesFromJson,
		'.json',
		false,
		'importProperties'
	);
}

async function importTypesFromJson(jsonContent: string): Promise<void> {
	try {
		const content = JSON.parse(jsonContent);
		if (content && typeof content === 'object' && 'types' in content && typeof content.types === 'object') {
			const newTypes = Object.entries(content.types).map(([name, type]) => {
				if (typeof type !== 'string') {
					console.warn(`Invalid type for property "${name}". Using 'text' as default.`);
					return { name, type: 'text', defaultValue: '' };
				}
				return { name, type, defaultValue: '' };
			});

			await mergePropertyTypes(newTypes);
			updatePropertyTypesList();
		} else {
			throw new Error('Invalid types.json format: "types" property not found or is not an object');
		}
	} catch (error) {
		console.error('Error parsing types.json:', error);
		throw new Error(`Error importing types.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function mergePropertyTypes(newTypes: PropertyType[]): Promise<void> {
	console.log('Merging property types');
	for (const newType of newTypes) {
		console.log(`Processing type: ${newType.name}, type: ${newType.type}`);
		if (newType.name === 'tags') {
			console.log('Ensuring tags is multitext');
			await updatePropertyType('tags', 'multitext', '');
		} else {
			const existingType = generalSettings.propertyTypes.find(pt => pt.name === newType.name);
			if (existingType) {
				console.log(`Existing type found for ${newType.name}: ${existingType.type}`);
				if (existingType.type !== newType.type) {
					const useNewType = await resolveConflict(newType.name, 'type', existingType.type, newType.type);
					if (useNewType) {
						console.log(`Updating existing type: ${newType.name} to ${newType.type}`);
						await updatePropertyType(newType.name, newType.type, existingType.defaultValue);
					} else {
						console.log(`Keeping existing type: ${newType.name} as ${existingType.type}`);
					}
				} else {
					console.log(`No changes needed for existing type: ${newType.name}`);
				}
			} else {
				console.log(`Adding new type: ${newType.name} as ${newType.type}`);
				await addPropertyType(newType.name, newType.type, '');
			}
		}
	}

	await saveSettings();
	console.log('Property types merged and saved');
}

async function resolveConflict(name: string, field: string, existingValue: string, newValue: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const message = `Property "${name}" has a conflict:\n${field}: "${existingValue}" -> "${newValue}"\nDo you want to update this ${field}?`;
		if (confirm(message)) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
}

async function exportTypesJson(): Promise<void> {
	const typesObject = generalSettings.propertyTypes.reduce((acc, { name, type }) => {
		acc[name] = type;
		return acc;
	}, {} as Record<string, string>);

	const content = JSON.stringify({ types: typesObject }, null, 2);
	const fileName = 'types.json';

	await saveFile({
		content,
		fileName,
		mimeType: 'application/json',
		onError: (error) => console.error('Failed to export types:', error)
	});
}

export async function addPropertyType(name: string, type: string = 'text', defaultValue: string = ''): Promise<void> {
	console.log(`addPropertyType called with: name=${name}, type=${type}, defaultValue=${defaultValue}`);
	const existingPropertyType = generalSettings.propertyTypes.find(pt => pt.name === name);
	if (!existingPropertyType) {
		console.log(`Adding new property type: ${name} with type ${type}`);
		const newPropertyType: PropertyType = { name, type };
		if (defaultValue !== null && defaultValue !== '') {
			newPropertyType.defaultValue = defaultValue;
		}
		generalSettings.propertyTypes.push(newPropertyType);
		await saveSettings();
	} else if (existingPropertyType.type !== type || existingPropertyType.defaultValue !== defaultValue) {
		console.log(`Updating existing property type: ${name} from ${existingPropertyType.type} to ${type}`);
		existingPropertyType.type = type;
		if (defaultValue !== null && defaultValue !== '') {
			existingPropertyType.defaultValue = defaultValue;
		} else {
			delete existingPropertyType.defaultValue;
		}
		await saveSettings();
	} else {
		console.log(`Property type ${name} already exists and is up to date`);
	}
	console.log('Current property types:', JSON.stringify(generalSettings.propertyTypes, null, 2));
}

export async function updatePropertyType(name: string, newType: string, newDefaultValue?: string): Promise<void> {
	const index = generalSettings.propertyTypes.findIndex(p => p.name === name);
	if (index !== -1) {
		generalSettings.propertyTypes[index].type = newType;
		if (newDefaultValue !== undefined && newDefaultValue !== null && newDefaultValue !== '') {
			generalSettings.propertyTypes[index].defaultValue = newDefaultValue;
		} else {
			delete generalSettings.propertyTypes[index].defaultValue;
		}
	} else {
		const newPropertyType: PropertyType = { name, type: newType };
		if (newDefaultValue !== undefined && newDefaultValue !== null && newDefaultValue !== '') {
			newPropertyType.defaultValue = newDefaultValue;
		}
		generalSettings.propertyTypes.push(newPropertyType);
	}
	await saveSettings();
}

export async function removePropertyType(name: string): Promise<void> {
	generalSettings.propertyTypes = generalSettings.propertyTypes.filter(p => p.name !== name);
	await saveSettings();
	updatePropertyTypesList();
}

function setupDeleteUnusedPropertiesButton(): void {
	const deleteUnusedButton = document.getElementById('delete-unused-properties-btn');
	if (deleteUnusedButton) {
		deleteUnusedButton.addEventListener('click', deleteUnusedProperties);
	}
}

async function deleteUnusedProperties(): Promise<void> {
	const usedProperties = new Set<string>();
	
	// Collect all properties used in templates
	templates.forEach(template => {
		template.properties.forEach(property => {
			usedProperties.add(property.name);
		});
	});

	// Filter out unused properties
	const unusedProperties = generalSettings.propertyTypes.filter(pt => !usedProperties.has(pt.name) && pt.name !== 'tags');
	
	if (unusedProperties.length === 0) {
		alert(getMessage('noUnusedProperties'));
		return;
	}

	const confirmMessage = `Are you sure you want to remove ${unusedProperties.length} unused properties?`;
	if (confirm(confirmMessage)) {
		generalSettings.propertyTypes = generalSettings.propertyTypes.filter(pt => usedProperties.has(pt.name) || pt.name === 'tags');
		await saveSettings();
		updatePropertyTypesList();
	}
}

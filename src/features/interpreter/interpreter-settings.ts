import { ModelConfig, Provider } from '../../types/types.js';
import { generalSettings, loadSettings, saveSettings } from '../../platform/browser/storage-utils.js';
import { initializeIcons } from '../../icons/icons.js';
import { showModal, hideModal } from '../../shared/dom/modal-utils.js';
import { getMessage, translatePage } from '../../platform/browser/i18n.js';
import { debugLog } from '../../platform/browser/debug.js';
import { clearModelSelection, renderModelList, renderModelSelection, renderProviderList } from '../../components/settings/interpreter-lists.js';

export interface PresetProvider {
	id: string;
	name: string;
	baseUrl: string;
	apiKeyUrl?: string;
	apiKeyRequired?: boolean;
	modelsList?: string;
	popularModels?: Array<{
		id: string;
		name: string;
		recommended?: boolean;
	}>;
}

interface ProviderPresets {
	version: string;
	[key: string]: PresetProvider | string;
}

const PROVIDERS_URL = 'https://raw.githubusercontent.com/uicnz/aria-clip/refs/heads/main/providers.json';

let cachedPresets: Record<string, PresetProvider> | null = null;

let cachedPresetProviders: Record<string, PresetProvider> | null = null;

export async function getPresetProviders(): Promise<Record<string, PresetProvider>> {
	if (cachedPresets) {
		return cachedPresets;
	}

	try {
		debugLog('Providers', 'Loading provider catalog:', PROVIDERS_URL);
		const response = await fetch(PROVIDERS_URL);
		if (!response.ok) {
			throw new Error(`Unable to load provider catalog (${response.status})`);
		}
		const data = await response.json() as ProviderPresets;
		const providers: Record<string, PresetProvider> = {};

		for (const [id, value] of Object.entries(data)) {
			if (id === 'version' || typeof value === 'string') continue;
			providers[id] = { ...value, id };
		}

		cachedPresets = providers;
		debugLog('Providers', 'Loaded provider catalog:', providers);
		return cachedPresets;
	} catch (error) {
		console.error('Failed to load provider catalog:', error);
		return {};
	}
}

export function updatePromptContextVisibility(): void {
	const promptContextContainer = document.getElementById('prompt-context-container');
	const templateAdvancedSection = document.getElementById('template-advanced-section');
	const interpreterSection = document.getElementById('interpreter-section');

	if (promptContextContainer) {
		promptContextContainer.style.display = generalSettings.interpreterEnabled ? 'block' : 'none';
	}

	if (templateAdvancedSection) {
		templateAdvancedSection.style.display = generalSettings.interpreterEnabled ? 'block' : 'none';
	}

	if (interpreterSection) {
		interpreterSection.classList.toggle('is-disabled', !generalSettings.interpreterEnabled);
	}
}

export async function initializeInterpreterSettings(): Promise<void> {
	try {
		const interpreterSettingsForm = document.getElementById('interpreter-settings-form');
		if (interpreterSettingsForm) {
			interpreterSettingsForm.addEventListener('input', debounce(saveInterpreterSettingsFromForm, 500));
		}

		await loadSettings();
		debugLog('Interpreter', 'Loaded general settings:', generalSettings);

		// Ensure models and providers are valid arrays
		if (!Array.isArray(generalSettings.models)) {
			console.warn('Invalid models data, resetting to empty array');
			generalSettings.models = [];
		}
		if (!Array.isArray(generalSettings.providers)) {
			console.warn('Invalid providers data, resetting to empty array');
			generalSettings.providers = [];
		}

		cachedPresetProviders = await getPresetProviders();
		debugLog('Interpreter', 'Fetched preset providers:', cachedPresetProviders);

		// Initialize lists with error handling
		try {
			initializeProviderList();
		} catch (error) {
			console.error('Error initializing provider list:', error);
			generalSettings.providers = [];
		}

		try {
			initializeModelList();
		} catch (error) {
			console.error('Error initializing model list:', error);
			generalSettings.models = [];
		}

		const defaultPromptContextInput = document.getElementById('default-prompt-context') as HTMLTextAreaElement;
		if (defaultPromptContextInput) {
			defaultPromptContextInput.value = generalSettings.defaultPromptContext;
		}

		updatePromptContextVisibility();
		initializeAutoSave();
		
		const addModelBtn = document.getElementById('add-model-btn');
		if (addModelBtn) {
			addModelBtn.addEventListener('click', (event) => addModelToList(event));
		}

		const addProviderBtn = document.getElementById('add-provider-btn');
		if (addProviderBtn) {
			addProviderBtn.addEventListener('click', (event) => addProviderToList(event));
		}
	} catch (error) {
		console.error('Error in initializeInterpreterSettings:', error);
		// Reset to safe defaults and re-throw to be handled by caller
		generalSettings.models = [];
		generalSettings.providers = [];
		generalSettings.interpreterEnabled = false;
		throw error;
	}
}

function initializeProviderList() {
	debugLog('Providers', 'Initializing provider list with:', generalSettings.providers);
	const providerList = document.getElementById('provider-list');
	if (!providerList) {
		console.error('Provider list element not found');
		return;
	}

	const sortedProviders = [...generalSettings.providers].filter(p => p).sort((a, b) => 
		a.name.toLowerCase().localeCompare(b.name.toLowerCase())
	);

	const rows = sortedProviders.map((provider) => {
		const originalIndex = generalSettings.providers.findIndex(p => p.id === provider.id);
		const presetProvider = Object.values(cachedPresetProviders || {}).find(
			preset => preset.name === provider.name
		);
		return {
			provider,
			index: originalIndex,
			missingApiKey: Boolean(presetProvider?.apiKeyRequired && !provider.apiKey)
		};
	});

	renderProviderList(providerList, rows, {
		edit: editProvider,
		remove: deleteProvider,
		missingApiKeyLabel: getMessage('apiKeyMissing')
	});
	debugLog('Providers', 'Provider list initialized');
}

function addProviderToList(event: Event) {
	event.preventDefault();
	debugLog('Providers', 'Adding new provider');
	const newProvider: Provider = {
		id: Date.now().toString(),
		name: '',
		baseUrl: '',
		apiKey: ''
	};
	showProviderModal(newProvider);
}

function editProvider(index: number) {
	const providerToEdit = generalSettings.providers[index];
	showProviderModal(providerToEdit, index);
}

function duplicateProvider(index: number) {
	const providerToDuplicate = generalSettings.providers[index];
	const duplicatedProvider: Provider = {
		...providerToDuplicate,
		id: Date.now().toString(),
		name: `${providerToDuplicate.name} (copy)`,
		apiKey: ''
	};

	generalSettings.providers.push(duplicatedProvider);
	saveSettings();
	initializeProviderList();

	const newIndex = generalSettings.providers.length - 1;
	showProviderModal(duplicatedProvider, newIndex);
}
void duplicateProvider;

function deleteProvider(index: number): void {
	const providerToDelete = generalSettings.providers[index];
	
	const modelsUsingProvider = generalSettings.models.filter(m => m.providerId === providerToDelete.id);
	if (modelsUsingProvider.length > 0) {
		alert(getMessage('cannotDeleteProvider', [providerToDelete.name, modelsUsingProvider.length.toString()]));
		return;
	}

	if (confirm(getMessage('deleteProviderConfirm'))) {
		generalSettings.providers.splice(index, 1);
		saveSettings();
		initializeProviderList();
	}
}

async function showProviderModal(provider: Provider, index?: number) {
	debugLog('Providers', 'Showing provider modal:', { provider, index });

	if (!cachedPresetProviders) {
		cachedPresetProviders = await getPresetProviders();
	}

	await translatePage();
	const modal = await showModal('provider-modal');
	if (!modal) {
		console.error('Provider modal did not mount');
		return;
	}
	initializeIcons(modal);

	const titleElement = modal.querySelector('.modal-title');
	if (titleElement) {
		titleElement.setAttribute('data-i18n', index !== undefined ? 'editProvider' : 'addProviderTitle');
	}

	const form = modal.querySelector('#provider-form') as HTMLFormElement;
	if (form) {
		const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
		const baseUrlInput = form.querySelector('[name="baseUrl"]') as HTMLInputElement;
		const apiKeyInput = form.querySelector('[name="apiKey"]') as HTMLInputElement;
		const presetSelect = form.querySelector('[name="preset"]') as HTMLSelectElement;
		const nameContainer = nameInput.closest('[data-slot="field"]') as HTMLElement;
		const apiKeyContainer = apiKeyInput.closest('[data-slot="field"]') as HTMLElement;
		const apiKeyDescription = apiKeyContainer?.querySelector('[data-slot="field-description"]') as HTMLElement;

		if (!apiKeyContainer || !apiKeyDescription || !nameContainer || !presetSelect || !nameInput || !baseUrlInput || !apiKeyInput) {
			console.error('Required provider modal elements not found');
			return;
		}

		nameInput.value = '';
		baseUrlInput.value = '';
		apiKeyInput.value = '';
		presetSelect.value = '';

		let currentPresetId: string | null = null;
		if (index !== undefined) {
			nameInput.value = provider.name;
			baseUrlInput.value = provider.baseUrl;
			apiKeyInput.value = provider.apiKey;

			const matchingPreset = Object.entries(cachedPresetProviders || {}).find(([_, p]) => p.baseUrl === provider.baseUrl);
			currentPresetId = matchingPreset ? matchingPreset[0] : null;
			
			if (!currentPresetId) {
				const nameMatchingPreset = Object.entries(cachedPresetProviders || {}).find(([_, p]) => p.name === provider.name);
				currentPresetId = nameMatchingPreset ? nameMatchingPreset[0] : null;
			}
			
			presetSelect.value = currentPresetId || '';
		} else {
			const anthropicPreset = Object.entries(cachedPresetProviders || {}).find(([_, p]) => p.name === 'Anthropic');
			presetSelect.value = anthropicPreset ? anthropicPreset[0] : '';
		}

		const updateVisibility = () => {
			const selectedPresetId = presetSelect.value;
			const selectedPreset = selectedPresetId ? (cachedPresetProviders || {})[selectedPresetId] : null;

			nameContainer.style.display = selectedPreset ? 'none' : 'block';
			
			if (selectedPreset) {
				nameInput.value = selectedPreset.name;
				
				const editingOriginalPreset = index !== undefined && selectedPresetId === currentPresetId;
				baseUrlInput.value = editingOriginalPreset ? provider.baseUrl : selectedPreset.baseUrl;
				apiKeyInput.value = editingOriginalPreset ? provider.apiKey : '';

				apiKeyContainer.style.display = selectedPreset.apiKeyRequired === false ? 'none' : 'block';

				if (selectedPreset.apiKeyRequired !== false && selectedPreset.apiKeyUrl) {
					const message = getMessage('getApiKeyHere').replace('$1', selectedPreset.name);
					apiKeyDescription.textContent = getMessage('providerApiKeyDescription') + ' ';
					const linkElement = document.createElement('a');
					linkElement.href = selectedPreset.apiKeyUrl;
					linkElement.target = '_blank';
					linkElement.textContent = message;
					apiKeyDescription.appendChild(linkElement);
				} else {
					apiKeyDescription.textContent = getMessage('providerApiKeyDescription');
				}
			} else {
				if (index === undefined || (index !== undefined && currentPresetId)) {
					nameInput.value = '';
					baseUrlInput.value = '';
					apiKeyInput.value = '';
				} else if (index !== undefined && !currentPresetId) {
					nameInput.value = provider.name;
					baseUrlInput.value = provider.baseUrl;
					apiKeyInput.value = provider.apiKey;
				}
				
				apiKeyContainer.style.display = 'block';
				apiKeyDescription.textContent = getMessage('providerApiKeyDescription');
			}
		};

		presetSelect.addEventListener('change', updateVisibility);
		updateVisibility();
	}

	const confirmBtn = modal.querySelector('.provider-confirm-btn');
	const cancelBtn = modal.querySelector('.provider-cancel-btn');

	const newConfirmBtn = confirmBtn?.cloneNode(true);
	const newCancelBtn = cancelBtn?.cloneNode(true);
	if (confirmBtn && newConfirmBtn) {
		confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
	}
	if (cancelBtn && newCancelBtn) {
		cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);
	}

	newConfirmBtn?.addEventListener('click', async () => {
		const formData = new FormData(form);
		const name = formData.get('name') as string;
		const baseUrl = formData.get('baseUrl') as string;
		const apiKey = formData.get('apiKey') as string;
		const presetId = (form.querySelector('[name="preset"]') as HTMLSelectElement).value;
		
		const updatedProvider: Provider = {
			id: provider.id,
			name: name,
			baseUrl: baseUrl,
			apiKey: apiKey,
			apiKeyRequired: true
		};

		debugLog('Providers', 'Saving provider:', updatedProvider);

		if (!updatedProvider.name || !updatedProvider.baseUrl) {
			alert(getMessage('providerRequiredFields'));
			return;
		}

		if (presetId && cachedPresetProviders && cachedPresetProviders[presetId]) {
			const providerPreset = cachedPresetProviders[presetId];
			
			updatedProvider.name = providerPreset.name;
			
			const providerPresetBaseUrl = providerPreset.baseUrl;
			// Use the user-provided baseUrl if it's different from the preset baseUrl
			updatedProvider.baseUrl = baseUrl !== providerPresetBaseUrl ? baseUrl : providerPresetBaseUrl;
			updatedProvider.apiKeyRequired = providerPreset.apiKeyRequired !== false;
		}

		if (index !== undefined) {
			generalSettings.providers[index] = updatedProvider;
		} else {
			generalSettings.providers.push(updatedProvider);
		}

		debugLog('Providers', 'Updated providers list:', generalSettings.providers);

		try {
			await saveSettings();
			debugLog('Providers', 'Settings saved');
			initializeProviderList();
			hideModal(modal);
		} catch (error) {
			console.error('Failed to save settings:', error);
			alert(getMessage('failedToSaveProvider'));
		}
	});

	newCancelBtn?.addEventListener('click', () => {
		hideModal(modal);
	});

}

export function initializeModelList() {
	const modelList = document.getElementById('model-list');
	if (!modelList) return;

	const sortedModels = [...generalSettings.models].filter(m => m).sort((a, b) => 
		a.name.toLowerCase().localeCompare(b.name.toLowerCase())
	);

	const rows = sortedModels.flatMap((model) => {
		const originalIndex = generalSettings.models.findIndex(m => m.id === model.id);
		if (originalIndex === -1) return [];
		return [{
			model,
			index: originalIndex,
			providerName: generalSettings.providers.find(p => p.id === model.providerId)?.name
		}];
	});

	renderModelList(modelList, rows, {
		edit: editModel,
		duplicate: duplicateModel,
		remove: deleteModel,
		setEnabled: (index, enabled) => {
			if (!generalSettings.models[index]) return;
			generalSettings.models[index].enabled = enabled;
			void saveSettings();
		},
		unknownProviderLabel: getMessage('unknownProvider')
	});
}

function addModelToList(event: Event) {
	event.preventDefault();
	const newModel: ModelConfig = {
		id: Date.now().toString(),
		providerId: '',
		providerModelId: '',
		name: '',
		enabled: true
	};
	showModelModal(newModel);
}

function editModel(index: number) {
	const modelToEdit = generalSettings.models[index];
	showModelModal(modelToEdit, index);
}

async function showModelModal(model: ModelConfig, index?: number) {
	debugLog('Models', 'Showing model modal:', { model, index });

	if (!cachedPresetProviders) {
		cachedPresetProviders = await getPresetProviders();
	}

	await translatePage();
	const modal = await showModal('model-modal');
	if (!modal) {
		console.error('Model modal did not mount');
		return;
	}
	initializeIcons(modal);

	const titleElement = modal.querySelector('.modal-title');
	if (titleElement) {
		titleElement.setAttribute('data-i18n', index !== undefined ? 'editModel' : 'addModelTitle');
	}

	const form = modal.querySelector('#model-form') as HTMLFormElement;
	if (form) {
		const providerSelect = form.querySelector('[name="providerId"]') as HTMLSelectElement;
		const modelIdInput = form.querySelector('[name="providerModelId"]') as HTMLInputElement;
		const modelIdDescriptionContainer = modelIdInput
			?.closest('[data-slot="field"]')
			?.querySelector('[data-slot="field-description"]') as HTMLElement;
		const modelSelectionContainer = form.querySelector('.model-selection-container') as HTMLElement;
		const modelSelectionRadios = form.querySelector('#model-selection-radios') as HTMLElement;
		const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
		const providerModelIdInput = form.querySelector('[name="providerModelId"]') as HTMLInputElement;

		if (!modelIdDescriptionContainer || !modelSelectionContainer || !modelSelectionRadios || !nameInput || !providerModelIdInput || !providerSelect) {
			console.error('Required model modal form elements not found');
			return;
		}

		// Clear existing provider options
		providerSelect.textContent = '';
		const defaultOption = document.createElement('option');
		defaultOption.value = '';
		defaultOption.textContent = getMessage('selectProvider');
		defaultOption.disabled = true;
		defaultOption.selected = true;
		providerSelect.appendChild(defaultOption);

		const sortedProviders = [...generalSettings.providers].filter(p => p).sort((a, b) => 
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);
		sortedProviders.forEach(provider => {
			const option = document.createElement('option');
			option.value = provider.id;
			option.textContent = provider.name;
			providerSelect.appendChild(option);
		});

		nameInput.value = '';
		providerModelIdInput.value = '';
		nameInput.disabled = true;
		providerModelIdInput.disabled = true;
		modelSelectionContainer.style.display = 'none';
		clearModelSelection(modelSelectionRadios);
		modelIdDescriptionContainer.textContent = getMessage('providerModelIdDescription');

		const updateModelOptions = () => {
			const selectedProviderId = providerSelect.value;
			const provider = generalSettings.providers.find(p => p.id === selectedProviderId);
			
			nameInput.value = (index !== undefined && model.providerId === selectedProviderId) ? model.name : '';
			providerModelIdInput.value = (index !== undefined && model.providerId === selectedProviderId) ? model.providerModelId || '' : '';
			nameInput.disabled = false;
			providerModelIdInput.disabled = false;
			clearModelSelection(modelSelectionRadios);
			modelSelectionContainer.style.display = 'none';
			modelIdDescriptionContainer.textContent = getMessage('providerModelIdDescription');

			if (provider && cachedPresetProviders) {
				const presetProvider = Object.values(cachedPresetProviders).find(
					preset => preset.name === provider.name 
				);

				if (presetProvider?.modelsList) {
					modelIdDescriptionContainer.textContent = getMessage('providerModelIdDescription') + ' ';
					const linkElement = document.createElement('a');
					linkElement.href = presetProvider.modelsList;
					linkElement.target = '_blank';
					linkElement.textContent = getMessage('modelsListFor', provider.name);
					modelIdDescriptionContainer.appendChild(linkElement);
					modelIdDescriptionContainer.appendChild(document.createTextNode('.'));
				}

				if (presetProvider?.popularModels?.length) {
					modelSelectionContainer.style.display = 'block';
					const popularMatch = presetProvider.popularModels.some(pm => pm.id === model.providerModelId);
					let selectedModel = '';
					if (index !== undefined && model.providerId === selectedProviderId && !popularMatch) {
						selectedModel = 'other';
					} else if (index !== undefined && model.providerId === selectedProviderId) {
						selectedModel = model.providerModelId;
					} else if (index === undefined) {
						const recommended = presetProvider.popularModels.find(pm => pm.recommended);
						selectedModel = recommended?.id || 'other';
					}

					renderModelSelection(
						modelSelectionRadios,
						presetProvider.popularModels,
						selectedModel,
						{ recommended: getMessage('recommended'), custom: getMessage('custom') },
						(value) => {
							if (value === 'other') {
								if (!(index !== undefined && model.providerId === selectedProviderId && !popularMatch)) {
									nameInput.value = '';
									providerModelIdInput.value = '';
								}
								nameInput.disabled = false;
								providerModelIdInput.disabled = false;
								return;
							}

							const selectedPopModel = presetProvider.popularModels?.find(item => item.id === value);
							if (selectedPopModel) {
								nameInput.value = selectedPopModel.name;
								providerModelIdInput.value = selectedPopModel.id;
								nameInput.disabled = false;
								providerModelIdInput.disabled = false;
							}
						}
					);

					if (selectedModel && selectedModel !== 'other') {
						const selectedPopModel = presetProvider.popularModels.find(item => item.id === selectedModel);
						if (selectedPopModel && index === undefined) {
							nameInput.value = selectedPopModel.name;
							providerModelIdInput.value = selectedPopModel.id;
						}
					}
				}
			}
		};

		providerSelect.addEventListener('change', updateModelOptions);

		if (index !== undefined) {
			providerSelect.value = model.providerId;
			updateModelOptions(); 
			nameInput.value = model.name;
			providerModelIdInput.value = model.providerModelId || '';
		} else {
			if (sortedProviders.length > 0) {
				// Maybe default to first provider? Or leave blank? Let's leave blank for now.
				// providerSelect.value = sortedProviders[0].id; 
				// updateModelOptions();
			} else {
				console.warn("No providers configured. Cannot add models.");
				// Consider disabling the confirm button or showing a message.
			}
		}

		translatePage();

		const confirmBtn = modal.querySelector('.model-confirm-btn');
		const cancelBtn = modal.querySelector('.model-cancel-btn');

		if (!confirmBtn || !cancelBtn) {
			console.error('Modal buttons not found');
			return;
		}

		const newConfirmBtn = confirmBtn.cloneNode(true);
		const newCancelBtn = cancelBtn.cloneNode(true);
		confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
		cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

		newConfirmBtn.addEventListener('click', async () => {
			const formData = new FormData(form);
			const selectedProviderId = formData.get('providerId') as string;
			
			let updatedModel: ModelConfig = {
				id: model.id,
				providerId: selectedProviderId,
				providerModelId: '',
				name: '',
				enabled: model.enabled
			};

			updatedModel.name = formData.get('name') as string;
			updatedModel.providerModelId = formData.get('providerModelId') as string;

			if (!updatedModel.name || !updatedModel.providerId || !updatedModel.providerModelId) {
				alert(getMessage('modelRequiredFields'));
				return;
			}

			if (index !== undefined) {
				generalSettings.models[index] = updatedModel;
			} else {
				generalSettings.models.push(updatedModel);
			}

			try {
				await saveSettings();
				initializeModelList();
				hideModal(modal);
			} catch (error) {
				console.error('Failed to save model settings:', error);
				alert(getMessage('failedToSaveModel'));
			}
		});

		newCancelBtn?.addEventListener('click', () => {
			hideModal(modal);
		});

	}
}

function deleteModel(index: number) {
	if (confirm(getMessage('deleteModelConfirm'))) {
		generalSettings.models.splice(index, 1);
		saveSettings();
		initializeModelList();
	}
}

function initializeAutoSave(): void {
	const interpreterSettingsForm = document.getElementById('interpreter-settings-form');
	if (interpreterSettingsForm) {
		interpreterSettingsForm.addEventListener('input', debounce(saveInterpreterSettingsFromForm, 500));
	}
}

function saveInterpreterSettingsFromForm(): void {
	const defaultPromptContextInput = document.getElementById('default-prompt-context') as HTMLTextAreaElement;

	const updatedSettings: Partial<typeof generalSettings> = {}; 
	if (defaultPromptContextInput) {
		updatedSettings.defaultPromptContext = defaultPromptContextInput.value;
	}

	if (Object.keys(updatedSettings).length > 0) {
		saveSettings(updatedSettings);
	}
}

function debounce(func: Function, delay: number): (...args: any[]) => void {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	return (...args: any[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

function duplicateModel(index: number) {
	const modelToDuplicate = generalSettings.models[index];
	const duplicatedModel: ModelConfig = {
		...modelToDuplicate,
		id: Date.now().toString(),
		name: `${modelToDuplicate.name} (copy)`
	};

	generalSettings.models.splice(index + 1, 0, duplicatedModel); 
	
	saveSettings();
	initializeModelList();

	const newIndex = index + 1;
	showModelModal(duplicatedModel, newIndex);
}

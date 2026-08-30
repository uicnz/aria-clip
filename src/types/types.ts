import type { PropertyType } from '../schemas/template.js';
import type { Model as ModelConfig, Provider } from '../schemas/model.js';

export type {
	Property,
	PropertyType,
	Template,
	Behavior,
	ValueKind,
} from '../schemas/template.js';

export type { Model as ModelConfig, Provider } from '../schemas/model.js';

export interface ExtractedContent {
	[key: string]: string;
}

export type FilterFunction = (value: string, param?: string) => string | unknown[];

export interface PromptVariable {
	key: string;
	prompt: string;
	filters?: string;
}

export interface Rating {
	rating: number;
	date: string;
}

export type SaveBehavior = 'addToAria' | 'saveFile' | 'copyToClipboard';

export interface ReaderSettings {
	fontSize: number;
	lineHeight: number;
	maxWidth: number;
	appearance: 'auto' | 'light' | 'dark';
	blendImages: boolean;
	colorLinks: boolean;
	followLinks: boolean;
	pinPlayer: boolean;
	autoScroll: boolean;
	highlightActiveLine: boolean;
	customCss: string;
}

export interface Settings {
	vaults: string[];
	showMoreActionsButton: boolean;
	betaFeatures: boolean;
	legacyMode: boolean;
	silentOpen: boolean;
	openBehavior: 'popup' | 'embedded' | 'reader';
	highlighterEnabled: boolean;
	alwaysShowHighlights: boolean;
	highlightBehavior: string;
	interpreterModel?: string;
	models: ModelConfig[];
	providers: Provider[];
	interpreterEnabled: boolean;
	interpreterAutoRun: boolean;
	defaultPromptContext: string;
	propertyTypes: PropertyType[];
	readerSettings: ReaderSettings;
	stats: {
		addToAria: number;
		saveFile: number;
		copyToClipboard: number;
		share: number;
		readerMode: number;
	};
	history: HistoryEntry[];
	ratings: Rating[];
	saveBehavior: 'addToAria' | 'saveFile' | 'copyToClipboard';
}

export interface HistoryEntry {
	datetime: string;
	url: string;
	action: 'addToAria' | 'saveFile' | 'copyToClipboard' | 'share' | 'readerMode';
	title?: string;
	vault?: string;
	path?: string;
}

export interface ConversationMessage {
	author: string;
	content: string;
	timestamp?: string;
	metadata?: Record<string, unknown>;
}

export interface ConversationMetadata {
	title?: string;
	description?: string;
	site: string;
	url: string;
	messageCount: number;
	startTime?: string;
	endTime?: string;
}

export interface Footnote {
	url: string;
	text: string;
}

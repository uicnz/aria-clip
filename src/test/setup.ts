import { mock } from 'bun:test';
import browser, {
	i18n,
	runtime,
	storage,
	tabs,
} from '../platform/browser/__mocks__/webextension-polyfill.js';

process.env.TZ = 'UTC';

mock.module('webextension-polyfill', () => ({
	default: browser,
	i18n,
	runtime,
	storage,
	tabs,
}));

Object.defineProperties(globalThis, {
	alert: { configurable: true, writable: true, value: () => {} },
	DEBUG_MODE: { configurable: true, writable: true, value: false },
});

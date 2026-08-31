import { describe, expect, test } from 'bun:test';
import { BROWSERS, BrowserCatalogSchema, SetupResultSchema } from '../schemas/browser.js';
import { setup, type SetupHost } from './setup.js';

const installed = new Set([
	'/Applications/Google Chrome.app',
	'/Applications/Firefox.app',
	'/Applications/Safari.app',
]);

function host(launches: string[]): SetupHost {
	const catalog = BrowserCatalogSchema.parse({
		...BROWSERS,
		browsers: BROWSERS.browsers.map(browser => browser.id === 'chrome'
			? {
				...browser,
				route: {
					kind: 'store',
					url: 'https://chromewebstore.google.com/detail/aria-clip/example',
					label: 'Chrome Web Store',
				},
			}
			: browser),
	});
	return {
		platform: 'darwin',
		home: '/Users/test',
		env: {},
		probe: async path => installed.has(path),
		launch: async (_found, url) => {
			launches.push(url);
		},
		catalog,
	};
}

describe('browser setup', () => {
	test('detects every selected browser without launching during a dry run', async () => {
		const launches: string[] = [];
		const result = SetupResultSchema.parse(await setup({ dryRun: true }, host(launches)));

		expect(launches).toEqual([]);
		expect(result.browsers).toEqual([
			expect.objectContaining({ id: 'chrome', detected: true, state: 'ready', launched: false }),
			expect.objectContaining({ id: 'firefox', detected: true, state: 'unpublished', launched: false }),
			expect.objectContaining({ id: 'safari', detected: true, state: 'unpublished', launched: false }),
		]);
	});

	test('opens a verified route but requires browser confirmation', async () => {
		const launches: string[] = [];
		const result = await setup({ browsers: ['chrome'], dryRun: false }, host(launches));

		expect(launches).toEqual(['https://chromewebstore.google.com/detail/aria-clip/example']);
		expect(result.browsers).toEqual([
			expect.objectContaining({
				id: 'chrome',
				state: 'confirmation-required',
				launched: true,
				confirmationRequired: true,
			}),
		]);
		expect(JSON.stringify(result)).not.toContain('"installed"');
	});

	test('does not invent an action for an unpublished route', async () => {
		const launches: string[] = [];
		const result = await setup({ browsers: ['firefox'], dryRun: false }, host(launches));

		expect(launches).toEqual([]);
		expect(result.browsers[0]).toMatchObject({
			id: 'firefox',
			state: 'unpublished',
			confirmationRequired: false,
		});
	});
});

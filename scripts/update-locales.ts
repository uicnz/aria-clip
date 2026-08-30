import path from 'path';
import I18nAutomation from './i18n-automation.js';
import { loadEnv } from '../src/platform/node/env.js';

loadEnv();

const LOCALES_DIR = path.join(__dirname, '../src/_locales');
const SRC_DIR = path.join(__dirname, '../src');

async function main() {
	// Get locale from command line args if provided
	const args = process.argv.slice(2);
	const targetLocale = args[0];

	const automation = new I18nAutomation(LOCALES_DIR, process.env.OPENAI_API_KEY);
	
	try {
		await automation.processLocales(SRC_DIR, targetLocale);
		console.log('Successfully updated locales');
	} catch (error) {
		console.error('Failed to update locales:', error);
		process.exit(1);
	}
}

main();

import { describe, expect, test } from 'bun:test';
import type { DefuddleOptions, DefuddleResponse } from 'defuddle';
import { extractWith, type DefuddleInstance } from './defuddle.js';

function result(content: string): DefuddleResponse {
	return {
		title: 'Video',
		description: '',
		domain: 'youtube.com',
		favicon: '',
		image: '',
		language: 'en',
		parseTime: 1,
		published: '',
		author: '',
		site: 'YouTube',
		schemaOrgData: null,
		wordCount: content.split(/\s+/).length,
		content,
		variables: { transcript: content },
	};
}

describe('Defuddle extraction', () => {
	test('requires the async full-body path and never substitutes the sync result', async () => {
		let sync = 0;
		let async = 0;
		const full = result('opening middle closing');

		class Fixture implements DefuddleInstance {
			constructor(_document: Document, _options?: DefuddleOptions) {}

			parse(): DefuddleResponse {
				sync += 1;
				return result('thumbnail');
			}

			async parseAsync(): Promise<DefuddleResponse> {
				async += 1;
				return full;
			}
		}

		const extracted = await extractWith(Fixture, {} as Document, { url: 'https://youtube.com/watch?v=test' });

		expect(extracted).toBe(full);
		expect(extracted.variables?.transcript).toContain('closing');
		expect(async).toBe(1);
		expect(sync).toBe(0);
	});
});

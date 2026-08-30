import { CaptureSchema, type Capture } from '../schemas/capture.js';

export function capture(markdown = '# Note\n', fileName = 'note.md'): Capture {
	return CaptureSchema.parse({
		version: 1,
		captureId: '0'.repeat(32),
		capturedAt: '2026-08-30T00:00:00.000Z',
		producer: { name: 'Aria Clip', version: '0.1.0', runtime: 'test' },
		source: {
			url: 'https://example.com/note',
			title: 'Note',
			description: '',
			domain: 'example.com',
			site: '',
			author: '',
			published: '',
			language: 'en',
			favicon: '',
			image: '',
			hash: `sha256:${'0'.repeat(64)}`,
		},
		capture: {
			renderedMarkdown: markdown,
			articleHtml: '<p>Note</p>',
			selectedHtml: '',
			cleanedDocumentHtml: '<html><p>Note</p></html>',
			highlights: [],
			extractedContent: {},
			extractedVariables: {},
			schemaOrg: null,
			metaTags: [],
			wordCount: 1,
			parseDurationMilliseconds: 1,
		},
		rendering: {
			title: 'Note',
			fileName,
			artifactType: null,
			templateId: 'builtin-default',
			templateName: 'Default',
			templateContext: '',
			templateHash: `sha256:${'0'.repeat(64)}`,
			properties: [],
		},
		location: { behavior: 'create', noteName: 'note', folder: '', vault: '' },
		resources: [],
	});
}

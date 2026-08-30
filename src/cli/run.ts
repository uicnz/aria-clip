import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { clip, createAsyncResolver, createSelectorProcessor, type ClipResult } from '../api/index.js';
import { extract } from '../core/clipping/defuddle.js';
import { createArtifactMarkdownFilename } from '../core/artifacts/filename.js';
import { normalizeMarkdownOutput } from '../core/markdown/markdown-output.js';
import { compileTemplate } from '../features/templates/engine/template-compiler.js';
import { collectPrompts, replaceModel, replacePrompts } from '../features/templates/engine/prompts.js';
import { CaptureSchema } from '../schemas/capture.js';
import { TypesFileSchema, ValueKindSchema, type Template } from '../schemas/template.js';
import type { RunOpts } from './args.js';
import { loadConfig } from './config.js';
import { deliver, deliveryKind } from './deliver.js';
import { parseDocument, parser } from './dom.js';
import { fail, Fault } from './fault.js';
import { interpret, resolveModel } from './interpret.js';
import { findCommand } from './registry.js';
import { ResultSchema, type CommandName, type EventName, type Result } from './schema.js';
import { loadSource } from './source.js';
import { choose } from './templates.js';
import { writeTrace } from './trace.js';
import { PROTOCOL, VERSION } from './version.js';

const KindsSchema = z.record(z.string().min(1), ValueKindSchema);
const PropertyTypesSchema = z.union([KindsSchema, TypesFileSchema.transform(file => file.types)]);
const JsonSchema = z.json();
type Json = z.infer<typeof JsonSchema>;

export type Emit = (event: EventName, data?: Json) => void;

export interface RunInput {
	command: CommandName;
	url: string;
	opts: RunOpts;
	emit?: Emit;
}

function hash(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function propertyTypes(path?: string) {
	if (!path) return undefined;
	try {
		return PropertyTypesSchema.parse(JSON.parse(await readFile(resolve(path), 'utf8')));
	} catch (error) {
		fail('E_TEMPLATE_INVALID', `Property types file ${resolve(path)} is invalid.`, 'input', {
			hint: error instanceof Error ? error.message : 'Expected a JSON property-to-type mapping.',
		});
	}
}

function renderedTemplate(template: Template, prompts: ReturnType<typeof collectPrompts>, responses: ReadonlyMap<string, string>, provider: string, model: string, url: string): Template {
	const replace = (text: string): string => replaceModel(replacePrompts(text, prompts, responses, url), provider, model);
	return {
		...structuredClone(template),
		noteNameFormat: replace(template.noteNameFormat),
		noteContentFormat: replace(template.noteContentFormat),
		context: template.context ? replace(template.context) : template.context,
		properties: template.properties.map(property => ({ ...property, value: replace(property.value) })),
	};
}

function title(result: ClipResult): string {
	return result.properties.find(property => property.name === 'title')?.value
		|| result.variables['{{title}}']
		|| result.noteName;
}

export async function run(input: RunInput): Promise<Result> {
	const started = performance.now();
	const timing: Record<string, number> = {};
	const warnings: string[] = [];
	input.emit?.('started', { command: input.command });

	const fetchStart = performance.now();
	const source = await loadSource(input.url, input.opts);
	timing.fetch = performance.now() - fetchStart;
	input.emit?.('fetched', { url: source.finalUrl, bytes: source.bytes, source: source.kind });

	const extractStart = performance.now();
	const doc = parseDocument(source.html);
	let extracted;
	try {
		extracted = await extract(doc, { url: source.finalUrl });
	} catch (error) {
		fail('E_EXTRACT_FAILED', error instanceof Error ? error.message : 'Source extraction failed.', 'extract');
	}
	timing.extract = performance.now() - extractStart;
	input.emit?.('extracted', { title: extracted.title ?? '', words: extracted.wordCount ?? 0 });

	const matchStart = performance.now();
	const choice = await choose(input.command, source.finalUrl, input.opts, extracted.schemaOrgData);
	timing.match = performance.now() - matchStart;
	input.emit?.('matched', { id: choice.template.id, source: choice.source });

	const prompts = collectPrompts(choice.template);
	let activeTemplate = choice.template;
	const sugar = findCommand(input.command);
	const shouldInterpret = input.opts.interpret || sugar?.interpret === true || (input.command === 'auto' && prompts.length > 0);
	if (input.opts.interpret && prompts.length === 0) {
		fail('E_TEMPLATE_INVALID', `Template ${choice.template.name} has no Interpreter prompt.`, 'input');
	}
	if (prompts.length > 0 && !shouldInterpret) {
		fail('E_RENDER_FAILED', `Template ${choice.template.name} requires interpretation.`, 'render', {
			hint: 'Pass --interpret, use its semantic command, or choose the Default template.',
		});
	}

	const renderStart = performance.now();
	const kinds = await propertyTypes(input.opts.propertyTypes);
	let result = await clip({
		html: source.html,
		url: source.finalUrl,
		template: choice.template,
		documentParser: parser,
		propertyTypes: kinds,
		parsedDocument: doc,
		extracted,
		deferInterpreter: prompts.length > 0,
	});
	if (!result.variables['{{content}}']?.trim()) {
		fail('E_CONTENT_UNAVAILABLE', 'No usable page content was extracted.', 'extract', {
			hint: 'The page may require browser authentication or client-side rendering.',
		});
	}
	timing.render = performance.now() - renderStart;
	input.emit?.('rendered', { characters: result.fullContent.length });

	let provider: string | null = null;
	let model: string | null = null;
	let performed = false;
	if (shouldInterpret && prompts.length > 0) {
		if (input.opts.dryRun) {
			const config = await loadConfig(input.opts.config);
			const choice = resolveModel(input.opts.model ?? activeTemplate.model, config);
			provider = choice.provider;
			model = choice.model;
			warnings.push('Dry run: Interpreter call was resolved but not performed.');
		} else {
			input.emit?.('interpreting', { prompts: prompts.length });
			const config = await loadConfig(input.opts.config);
			const context = await compileTemplate(
				0,
				choice.template.context ?? '{{content}}',
				result.variables,
				source.finalUrl,
				createAsyncResolver(doc),
				createSelectorProcessor(doc),
			);
			const responses = new Map<string, string>();
			const interpretStart = performance.now();
			for (const prompt of prompts) {
				const response = await interpret({
					prompt: prompt.prompt,
					context,
					model: input.opts.model ?? choice.template.model,
					config,
					timeout: input.opts.timeout,
				});
				responses.set(prompt.key, response.markdown);
				provider = response.provider;
				model = response.model;
			}
			timing.interpret = performance.now() - interpretStart;
			performed = true;
			const template = renderedTemplate(choice.template, prompts, responses, provider ?? '', model ?? '', source.finalUrl);
			activeTemplate = template;
			result = await clip({
				html: source.html,
				url: source.finalUrl,
				template,
				documentParser: parser,
				propertyTypes: kinds,
				parsedDocument: doc,
				extracted,
			});
			input.emit?.('interpreted', { provider, model });
		}
	}

	const fileName = createArtifactMarkdownFilename(result.noteName, choice.template.artifactType);
	const markdown = normalizeMarkdownOutput(result.fullContent);
	const folder = await compileTemplate(
		0,
		activeTemplate.path,
		result.variables,
		source.finalUrl,
		createAsyncResolver(doc),
		createSelectorProcessor(doc),
	);
	const schema = JsonSchema.safeParse(extracted.schemaOrgData);
	const capture = CaptureSchema.parse(JSON.parse(JSON.stringify({
		version: 1,
		captureId: randomUUID().replaceAll('-', ''),
		capturedAt: new Date().toISOString(),
		producer: {
			name: 'Aria Clip',
			version: VERSION,
			runtime: process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`,
		},
		source: {
			url: source.finalUrl,
			title: result.variables['{{title}}'] ?? title(result),
			description: result.variables['{{description}}'] ?? '',
			domain: result.variables['{{domain}}'] ?? new URL(source.finalUrl).hostname,
			site: result.variables['{{site}}'] ?? '',
			author: result.variables['{{author}}'] ?? '',
			published: result.variables['{{published}}'] ?? '',
			language: result.variables['{{language}}'] ?? '',
			favicon: result.variables['{{favicon}}'] ?? '',
			image: result.variables['{{image}}'] ?? '',
			hash: hash(source.html),
		},
		capture: {
			renderedMarkdown: markdown,
			articleHtml: extracted.content ?? '',
			selectedHtml: '',
			cleanedDocumentHtml: source.html,
			highlights: [],
			extractedContent: Object.fromEntries(
				Object.entries(extracted.variables ?? {}).map(([key, value]) => [key, String(value ?? '')]),
			),
			extractedVariables: result.variables,
			schemaOrg: schema.success ? schema.data : null,
			metaTags: (extracted.metaTags ?? []).map(tag => ({
				name: tag.name ?? null,
				property: tag.property ?? null,
				content: tag.content ?? null,
			})),
			wordCount: extracted.wordCount ?? 0,
			parseDurationMilliseconds: timing.extract,
		},
		rendering: {
			title: title(result),
			fileName,
			artifactType: choice.template.artifactType ?? null,
			templateId: choice.template.id,
			templateName: choice.template.name,
			templateContext: activeTemplate.context ?? '',
			templateHash: hash(JSON.stringify(activeTemplate)),
			properties: result.properties.map(property => ({
				name: property.name,
				type: property.type ?? null,
				value: property.value,
			})),
		},
		location: {
			behavior: activeTemplate.behavior,
			noteName: result.noteName,
			folder,
			vault: input.opts.vault ?? activeTemplate.vault ?? '',
		},
		resources: [],
	})));
	input.emit?.('delivering', { target: deliveryKind(input.opts), dryRun: input.opts.dryRun });
	const deliveryStart = performance.now();
	const delivery = await deliver({
		capture,
		opts: input.opts,
	});
	timing.deliver = performance.now() - deliveryStart;
	timing.total = performance.now() - started;
	if (input.opts.open) warnings.push('--open is deprecated; use --add.');
	if (input.opts.trace && input.opts.dryRun) {
		warnings.push('Dry run: trace file was not written.');
	}

	const output = ResultSchema.parse({
		schemaVersion: PROTOCOL,
		ok: true,
		command: input.command,
		input: {
			requestedUrl: source.requestedUrl,
			finalUrl: source.finalUrl,
			source: source.kind,
			redirects: source.redirects,
			contentType: source.contentType,
			bytes: source.bytes,
			fetchedAt: source.fetchedAt,
			hash: hash(source.html),
		},
		template: {
			id: choice.template.id,
			name: choice.template.name,
			artifact: choice.template.artifactType ?? null,
			source: choice.source,
			version: '1',
			hash: hash(JSON.stringify(choice.template)),
		},
		interpreter: { performed, provider, model },
		artifact: {
			title: title(result),
			fileName,
			mediaType: 'text/markdown',
			hash: hash(markdown),
			markdown,
		},
		delivery,
		included: input.opts.include.length > 0 ? {
			source: input.opts.include.includes('source') ? result.variables['{{content}}'] : undefined,
			variables: input.opts.include.includes('variables') ? result.variables : undefined,
			trace: input.opts.include.includes('trace') ? {
				templateSource: choice.source,
				prompts: prompts.length,
				interpret: shouldInterpret,
				delivery: delivery.requested,
			} : undefined,
		} : undefined,
		warnings,
		timingMs: timing,
	});
	if (input.opts.trace && !input.opts.dryRun) await writeTrace(input.opts.trace, output);
	input.emit?.('completed', output);
	return output;
}

export function asFault(error: unknown): Fault {
	if (error instanceof Fault) return error;
	if (error instanceof z.ZodError) {
		return new Fault({
			code: 'E_USAGE',
			message: 'Input validation failed.',
			hint: z.prettifyError(error),
			retryable: false,
			stage: 'input',
		});
	}
	return new Fault({
		code: 'E_INTERNAL',
		message: error instanceof Error ? error.message : 'Unexpected internal failure.',
		retryable: false,
		stage: 'internal',
	});
}

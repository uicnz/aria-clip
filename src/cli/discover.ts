import { z } from 'zod';
import { collectPrompts } from '../features/templates/engine/prompts.js';
import { TemplateSchema } from '../schemas/template.js';
import { CaptureAckSchema, CaptureSchema } from '../schemas/capture.js';
import { ariaInfo } from '../integrations/aria/cli-delivery.js';
import { loadConfig, paths } from './config.js';
import { COMMANDS, findCommand } from './registry.js';
import {
	CapabilitySchema,
	DescribeSchema,
	EventSchema,
	FailureSchema,
	ResultSchema,
	SchemaNameSchema,
	SetupResultSchema,
	type Capability,
	type Describe,
	type SchemaName,
} from './schema.js';
import { allTemplates } from './templates.js';
import { PROTOCOL, VERSION } from './version.js';
import { fail } from './fault.js';

export function describe(name?: string): Describe {
	const command = name ? findCommand(name) : undefined;
	if (name && !command) fail('E_USAGE', `Unknown command ${name}.`, 'input', {
		hint: 'Run `aria-clip describe --json` to list commands.',
	});
	const selected = command ? [command] : COMMANDS;
	return DescribeSchema.parse({
		schemaVersion: PROTOCOL,
		program: 'aria-clip',
		commands: selected,
	});
}

export function schema(name: string): object {
	const key: SchemaName = SchemaNameSchema.parse(name);
	const schemas = {
		result: ResultSchema,
		error: FailureSchema,
		event: EventSchema,
		capabilities: CapabilitySchema,
		describe: DescribeSchema,
		template: TemplateSchema,
		capture: CaptureSchema,
		'capture-ack': CaptureAckSchema,
		setup: SetupResultSchema,
	} as const;
	return z.toJSONSchema(schemas[key]);
}

export function examples(): string[] {
	return COMMANDS.flatMap(command => command.examples);
}

export async function capabilities(config?: string): Promise<Capability> {
	const [aria, templates, settings] = await Promise.all([
		ariaInfo(),
		allTemplates(config),
		loadConfig(config),
	]);
	const activePaths = paths(config);
	const runtime = process.versions.bun ? { name: 'bun' as const, version: process.versions.bun } : { name: 'node' as const, version: process.versions.node };

	return CapabilitySchema.parse({
		schemaVersion: PROTOCOL,
		version: VERSION,
		protocolVersion: PROTOCOL,
		runtime: { ...runtime, platform: process.platform },
		input: ['network', 'file', 'stdin', 'envelope'],
		delivery: aria.available ? ['stdout', 'file', 'aria'] : ['stdout', 'file'],
		aria,
		paths: activePaths,
		setup: { command: 'setup', browsers: ['chrome', 'firefox', 'safari'] },
		providers: Object.entries(settings.providers).map(([id, provider]) => ({
			id,
			api: provider.api,
			credential: provider.keyEnv ? Boolean(process.env[provider.keyEnv]) : true,
		})),
		defaultModel: settings.defaultModel ?? null,
		models: settings.models,
		unavailable: [
			...(aria.available ? [] : [{
				feature: 'aria' as const,
				reason: aria.installed
					? 'Aria is installed but does not advertise clip.capture.v1 intake.'
					: 'The downstream aria executable is not on PATH.',
			}]),
			...(settings.models.length > 0 ? [] : [{ feature: 'interpreter' as const, reason: 'No Interpreter model is configured.' }]),
		],
		templates: templates.map(template => ({
			id: template.id,
			name: template.name,
			artifact: template.artifactType ?? null,
			interprets: collectPrompts(template).length > 0,
		})),
	});
}

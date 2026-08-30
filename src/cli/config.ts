import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import data from '../../providers.json' with { type: 'json' };
import {
	ApiSchema,
	CatalogSchema,
	ModelRefSchema,
	ProviderIdSchema,
	type ModelRef,
	type ProviderId,
} from '../schemas/model.js';
import { ariaHome } from '../platform/node/env.js';
import { fail } from './fault.js';

export { ApiSchema, ModelRefSchema, ProviderIdSchema } from '../schemas/model.js';

export const ProviderSchema = z.strictObject({
	api: ApiSchema,
	baseUrl: z.url(),
	keyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
});

export const ConfigSchema = z.strictObject({
	schemaVersion: z.literal('1').default('1'),
	defaultModel: ModelRefSchema.optional(),
	models: z.array(ModelRefSchema).default([]),
	providers: z.record(ProviderIdSchema, ProviderSchema).default({}),
});

export type { Api, ModelRef, ProviderId } from '../schemas/model.js';
export type Provider = z.infer<typeof ProviderSchema>;
export type Config = z.infer<typeof ConfigSchema>;

const catalog = CatalogSchema.parse(data);
const BUILTINS = z.record(ProviderIdSchema, ProviderSchema).parse(Object.fromEntries(
	Object.entries(catalog.providers).map(([id, provider]) => [id, {
		api: provider.api,
		baseUrl: provider.baseUrl,
		keyEnv: provider.keyEnv,
	}]),
));

export interface Paths {
	home: string;
	config: string;
	templates: string;
}

export function paths(explicit?: string): Paths {
	const home = ariaHome();
	return {
		home,
		config: resolve(explicit ?? process.env.ARIA_CLIP_CONFIG ?? join(home, 'clip', 'config.json')),
		templates: join(home, 'clip', 'templates'),
	};
}

function isErrno(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error;
}

async function loadUser(explicit?: string): Promise<Config> {
	const file = paths(explicit).config;
	let user: Config = ConfigSchema.parse({});
	try {
		user = ConfigSchema.parse(JSON.parse(await readFile(file, 'utf8')));
	} catch (error) {
		if (!isErrno(error) || error.code !== 'ENOENT') {
			fail('E_USAGE', `Could not read CLI configuration at ${file}.`, 'input', {
				hint: 'Run `aria-clip config path` to inspect the active location.',
			});
		}
	}

	return user;
}

export async function loadConfig(explicit?: string): Promise<Config> {
	const user = await loadUser(explicit);
	return ConfigSchema.parse({
		...user,
		defaultModel: process.env.ARIA_CLIP_MODEL ?? user.defaultModel,
		providers: { ...BUILTINS, ...user.providers },
	});
}

export async function setDefaultModel(ref: string, explicit?: string): Promise<void> {
	const model = ModelRefSchema.parse(ref);
	const file = paths(explicit).config;
	const config = await loadUser(explicit);
	const next = ConfigSchema.parse({
		...config,
		defaultModel: model,
		models: [...new Set([...config.models, model])],
	});
	await mkdir(dirname(file), { recursive: true });
	const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
	await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
	await rename(temp, file);
}

export function splitModel(ref: ModelRef): { provider: ProviderId; model: string } {
	const slash = ref.indexOf('/');
	return {
		provider: ProviderIdSchema.parse(ref.slice(0, slash)),
		model: ref.slice(slash + 1),
	};
}

import { randomUUID } from 'node:crypto';
import { link, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { z } from 'zod';
import { BUILTIN_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../features/templates/builtin-templates.js';
import { matchTemplate } from '../features/templates/engine/triggers.js';
import { TemplateSchema, type Template } from '../schemas/template.js';
import type { RunOpts } from './args.js';
import { paths } from './config.js';
import { fail, Fault } from './fault.js';
import { findCommand } from './registry.js';
import { type CommandName, type TemplateSource } from './schema.js';

export interface Choice {
	template: Template;
	source: TemplateSource;
}

function isErrno(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error;
}

function invalid(file: string, error: unknown): never {
	const detail = error instanceof z.ZodError ? z.prettifyError(error) : error instanceof Error ? error.message : 'Invalid JSON';
	fail('E_TEMPLATE_INVALID', `Template ${file} is invalid.`, 'input', { hint: detail });
}

export function builtins(): Template[] {
	return BUILTIN_TEMPLATES.map(definition => TemplateSchema.parse(definition.create()));
}

export async function loadTemplate(path: string): Promise<Template> {
	const resolved = resolve(path);
	try {
		return TemplateSchema.parse(JSON.parse(await readFile(resolved, 'utf8')));
	} catch (error) {
		invalid(resolved, error);
	}
}

async function write(path: string, value: string, overwrite: boolean): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await writeFile(temp, value, { encoding: 'utf8', flag: 'wx' });
		if (overwrite) await rename(temp, path);
		else {
			try {
				await link(temp, path);
			} catch (error) {
				if (isErrno(error) && error.code === 'EEXIST') {
					fail('E_DELIVERY_CONFLICT', `Template already exists: ${path}`, 'deliver', {
						hint: 'Choose another template ID or pass --overwrite.',
					});
				}
				throw error;
			}
			await unlink(temp);
		}
	} catch (error) {
		await unlink(temp).catch(() => undefined);
		throw error;
	}
}

export async function importTemplate(file: string, config?: string, overwrite = false): Promise<string> {
	const template = await loadTemplate(file);
	const output = join(paths(config).templates, `${template.id}.json`);
	try {
		await write(output, `${JSON.stringify(template, null, 2)}\n`, overwrite);
		return output;
	} catch (error) {
		if (error instanceof Fault) throw error;
		fail('E_DELIVERY_FAILED', error instanceof Error ? error.message : `Could not import ${file}.`, 'deliver');
	}
}

export async function exportTemplate(id: string, config?: string): Promise<string> {
	const template = (await allTemplates(config)).find(item => item.id === id);
	if (!template) fail('E_TEMPLATE_NOT_FOUND', `Template ${id} was not found.`, 'input');
	return `${JSON.stringify(template, null, 2)}\n`;
}

async function dir(path: string, optional = false): Promise<Template[]> {
	const resolved = resolve(path);
	let names: string[];
	try {
		names = (await readdir(resolved)).filter(name => extname(name) === '.json').sort();
	} catch (error) {
		if (optional && isErrno(error) && error.code === 'ENOENT') return [];
		fail('E_TEMPLATE_NOT_FOUND', `Could not read template directory ${resolved}.`, 'input', {
			hint: error instanceof Error ? error.message : 'Check the path and permissions.',
		});
	}
	return Promise.all(names.map(name => loadTemplate(join(resolved, name))));
}

async function pathChoice(path: string, url: string, schema?: unknown): Promise<Choice> {
	let info;
	try {
		info = await stat(resolve(path));
	} catch (error) {
		fail('E_TEMPLATE_NOT_FOUND', `Template path ${resolve(path)} does not exist.`, 'input', {
			hint: error instanceof Error ? error.message : 'Check the path.',
		});
	}
	if (info.isFile()) return { template: await loadTemplate(path), source: 'file' };
	if (!info.isDirectory()) fail('E_TEMPLATE_INVALID', `Template path ${resolve(path)} is not a file or directory.`, 'input');
	const items = await dir(path);
	const template = matchTemplate(items, url, schema);
	if (!template) {
		fail('E_TEMPLATE_NO_MATCH', `No template in ${resolve(path)} matched ${url}.`, 'match', {
			hint: 'Pass an explicit template file or inspect its triggers.',
		});
	}
	return { template, source: 'directory' };
}

async function pathExists(value: string): Promise<boolean> {
	try {
		await stat(resolve(value));
		return true;
	} catch (error) {
		if (isErrno(error) && error.code === 'ENOENT') return false;
		throw error;
	}
}

export async function allTemplates(config?: string): Promise<Template[]> {
	const builtin = builtins();
	const user = await dir(paths(config).templates, true);
	const byId = new Map(builtin.map(template => [template.id, template]));
	for (const template of user) byId.set(template.id, template);
	return [...byId.values()];
}

export async function choose(command: CommandName, url: string, opts: RunOpts, schema?: unknown): Promise<Choice> {
	if (opts.templateFile) return pathChoice(opts.templateFile, url, schema);
	if (opts.template && await pathExists(opts.template)) return pathChoice(opts.template, url, schema);

	const items = await allTemplates(opts.config);
	if (opts.template) {
		const template = items.find(item => item.id === opts.template);
		if (!template) fail('E_TEMPLATE_NOT_FOUND', `Template ${opts.template} was not found.`, 'input', {
			hint: 'Run `aria-clip templates list` to inspect stable IDs.',
		});
		return { template, source: template.id.startsWith('builtin-') ? 'builtin' : 'user' };
	}

	const sugar = findCommand(command)?.template;
	if (sugar) {
		const template = items.find(item => item.id === sugar);
		if (!template) fail('E_TEMPLATE_NOT_FOUND', `Built-in template ${sugar} is unavailable.`, 'internal');
		return { template, source: 'builtin' };
	}

	if (command === 'auto') {
		const template = matchTemplate(items, url, schema);
		if (template) return { template, source: 'auto' };
	}

	const template = items.find(item => item.id === DEFAULT_TEMPLATE_ID);
	if (!template) fail('E_TEMPLATE_NOT_FOUND', 'The Default template is unavailable.', 'internal');
	return { template, source: 'default' };
}

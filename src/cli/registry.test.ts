import { describe, expect, test } from 'bun:test';
import { TransformSchema } from './schema.js';
import { expand, findCommand } from './registry.js';

describe('CLI registry', () => {
	test.each(TransformSchema.options)('%s has one inspectable canonical expansion', name => {
		const command = findCommand(name);
		expect(command).toBeDefined();
		if (!command) return;
		const value = expand(command);
		expect(value).toMatchObject({
			command: name,
			interpret: true,
			defaultDelivery: 'stdout',
		});
		expect(value.canonical).toBe(`capture <url> --template ${command.template} --interpret`);
		expect(value.effects).toEqual(['network', 'model']);
	});

	test('keeps capture deterministic and model-free', () => {
		const command = findCommand('capture');
		expect(command).toBeDefined();
		if (!command) return;
		expect(expand(command)).toMatchObject({
			canonical: 'capture <url>',
			template: 'builtin-default',
			interpret: false,
			effects: ['network'],
		});
	});

	test('describes protocol defaults from the same option registry', () => {
		const capture = findCommand('capture');
		expect(capture?.opts.find(option => option.flags === '--to <target>')?.default).toBe('stdout');
		expect(capture?.opts.find(option => option.flags === '--timeout <ms>')?.default).toBe(30_000);
		expect(capture?.opts.find(option => option.flags === '--max-bytes <count>')?.default).toBe(10 * 1024 * 1024);
	});
});

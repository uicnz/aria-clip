import { describe, expect, it } from 'bun:test';
import { insertTextAtSelection } from './insert.js';

describe('insertTextAtSelection', () => {
	it('inserts a variable at the caret', () => {
		expect(insertTextAtSelection({ value: 'Hello ', start: 6, end: 6 }, '{{title}}')).toEqual({
			value: 'Hello {{title}}',
			caret: 15,
		});
	});

	it('replaces the selected text', () => {
		expect(insertTextAtSelection({ value: 'Hello world', start: 6, end: 11 }, '{{author}}')).toEqual({
			value: 'Hello {{author}}',
			caret: 16,
		});
	});
});

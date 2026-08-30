export interface TextSelection {
	value: string;
	start: number;
	end: number;
}

export function insertTextAtSelection(selection: TextSelection, insertion: string): { value: string; caret: number } {
	const start = Math.max(0, Math.min(selection.start, selection.value.length));
	const end = Math.max(start, Math.min(selection.end, selection.value.length));
	return {
		value: `${selection.value.slice(0, start)}${insertion}${selection.value.slice(end)}`,
		caret: start + insertion.length,
	};
}

export function isTemplateValueField(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
	if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
	return element.matches([
		'#note-name-format',
		'#template-path-name',
		'#note-content-format',
		'#prompt-context',
		'.property-value',
	].join(','));
}

export function insertVariableAtCursor(
	field: HTMLInputElement | HTMLTextAreaElement,
	variable: string,
): void {
	const start = field.selectionStart ?? field.value.length;
	const end = field.selectionEnd ?? start;
	const result = insertTextAtSelection({ value: field.value, start, end }, variable);
	const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
	if (valueSetter) valueSetter.call(field, result.value);
	else field.value = result.value;

	field.dispatchEvent(new Event('input', { bubbles: true }));
	field.focus();
	field.setSelectionRange(result.caret, result.caret);
}

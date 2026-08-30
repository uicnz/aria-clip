import DefuddleFullPackage from 'defuddle/full';
import { extractWith, type DefuddleConstructor } from './defuddle.js';
import type { DefuddleOptions, DefuddleResponse } from 'defuddle';

export const DefuddleFull = DefuddleFullPackage as unknown as DefuddleConstructor;

export function extractFull(
	document: Document,
	options?: DefuddleOptions,
	timeout?: number,
): Promise<DefuddleResponse> {
	return extractWith(DefuddleFull, document, options, timeout);
}

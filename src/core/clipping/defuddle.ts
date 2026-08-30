import DefuddlePackage from 'defuddle';
import DefuddleFullPackage from 'defuddle/full';
import type { DefuddleOptions, DefuddleResponse } from 'defuddle';

export interface DefuddleInstance {
	parse(): DefuddleResponse;
	parseAsync(): Promise<DefuddleResponse>;
}

type DefuddleConstructor = new (
	document: Document,
	options?: DefuddleOptions,
) => DefuddleInstance;

// Defuddle 0.19 publishes CommonJS JavaScript with ESM-shaped declarations
// but does not declare its package module type. Normalize that upstream
// boundary once for TypeScript NodeNext consumers.
export const Defuddle = DefuddlePackage as unknown as DefuddleConstructor;
export const DefuddleFull = DefuddleFullPackage as unknown as DefuddleConstructor;

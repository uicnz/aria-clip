import DefuddlePackage from 'defuddle';
import type { DefuddleOptions, DefuddleResponse } from 'defuddle';

export interface DefuddleInstance {
	parse(): DefuddleResponse;
	parseAsync(): Promise<DefuddleResponse>;
}

export type DefuddleConstructor = new (
	document: Document,
	options?: DefuddleOptions,
) => DefuddleInstance;

// Defuddle 0.19 publishes CommonJS JavaScript with ESM-shaped declarations
// but does not declare its package module type. Normalize that upstream
// boundary once for TypeScript NodeNext consumers.
export const Defuddle = DefuddlePackage as unknown as DefuddleConstructor;

export async function extractWith(
	Ctor: DefuddleConstructor,
	document: Document,
	options?: DefuddleOptions,
	timeout = 20_000,
): Promise<DefuddleResponse> {
	const defuddle = new Ctor(document, options);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const expired = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Defuddle timed out after ${timeout}ms`)), timeout);
	});

	try {
		return await Promise.race([defuddle.parseAsync(), expired]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export function extract(
	document: Document,
	options?: DefuddleOptions,
	timeout?: number,
): Promise<DefuddleResponse> {
	return extractWith(Defuddle, document, options, timeout);
}

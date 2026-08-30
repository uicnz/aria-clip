declare const DEBUG_MODE: boolean | undefined;

export type DebugValue = string | number | boolean | bigint | symbol | null | undefined | object;

const buildAllowsDebug = typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE;
let debugMode = false;

export function setDebugMode(enabled: boolean): void {
	debugMode = buildAllowsDebug && enabled;
}

export function debugLog(scope: string, ...values: DebugValue[]): void {
	if (buildAllowsDebug && debugMode) {
		console.log(`[${scope}]`, ...values);
	}
}

export function isDebugMode(): boolean {
	return buildAllowsDebug && debugMode;
}

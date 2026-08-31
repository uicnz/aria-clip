import { ErrorSchema, FailureSchema, type ClipError, type ErrorCode, type ExitCode, type Stage } from './schema.js';
import { PROTOCOL } from './version.js';

const EXIT_BY_STAGE = {
	input: 2,
	fetch: 3,
	extract: 4,
	match: 5,
	render: 5,
	interpret: 6,
	deliver: 7,
	capability: 8,
	setup: 8,
	internal: 10,
} as const satisfies Record<Stage, ExitCode>;

export interface ErrorDoc {
	meaning: string;
	recovery: string;
}

export const ERROR_DOCS = {
	E_USAGE: { meaning: 'The command, option, argument, or configuration is invalid.', recovery: 'Run `aria-clip --help` or the command with `--help`.' },
	E_URL_INVALID: { meaning: 'The source URL is invalid or does not use HTTP(S).', recovery: 'Pass a complete `https://…` URL.' },
	E_TEMPLATE_INVALID: { meaning: 'A template or property-type file failed validation.', recovery: 'Run `aria-clip templates validate <file>` and correct the reported field.' },
	E_TEMPLATE_NOT_FOUND: { meaning: 'The requested template does not exist.', recovery: 'Run `aria-clip templates list` and use a listed stable ID.' },
	E_TEMPLATE_NO_MATCH: { meaning: 'No template in the requested set matched the page.', recovery: 'Pass an explicit `--template` or `--template-file`.' },
	E_INPUT_FAILED: { meaning: 'An HTML or envelope input could not be read.', recovery: 'Check the path, permissions, and input encoding.' },
	E_FETCH_FAILED: { meaning: 'The page could not be fetched.', recovery: 'Check the URL and network, then retry if error.retryable is true.' },
	E_FETCH_TIMEOUT: { meaning: 'The page fetch exceeded its time limit.', recovery: 'Retry or pass a larger `--timeout` value.' },
	E_PRIVATE_NETWORK: { meaning: 'The URL targets a private, local, or loopback address.', recovery: 'Use a public URL or explicitly pass `--allow-private-network` for a trusted target.' },
	E_RESPONSE_TOO_LARGE: { meaning: 'The response exceeded the configured byte limit.', recovery: 'Use a smaller source or explicitly raise `--max-bytes`.' },
	E_CONTENT_UNAVAILABLE: { meaning: 'No usable page content was available.', recovery: 'Use `--html` with captured page HTML or choose a statically available page.' },
	E_BROWSER_REQUIRED: { meaning: 'The source requires authenticated or browser-rendered state.', recovery: 'Capture the rendered HTML in a browser and pass it with `--html`.' },
	E_EXTRACT_FAILED: { meaning: 'Content extraction failed.', recovery: 'Retry with saved HTML and report a reproducible fixture.' },
	E_RENDER_FAILED: { meaning: 'Template rendering could not produce an artifact.', recovery: 'Validate the template and inspect its required variables.' },
	E_MODEL_NOT_CONFIGURED: { meaning: 'No usable Interpreter model or credential is configured.', recovery: 'Run `aria-clip models configure provider/model` and set the provider credential environment variable.' },
	E_PROVIDER_FAILED: { meaning: 'The Interpreter provider rejected or malformed the request.', recovery: 'Check the model, provider endpoint, credential, and error.retryable.' },
	E_DELIVERY_CONFLICT: { meaning: 'Delivery would replace an existing target.', recovery: 'Choose another destination or explicitly pass `--overwrite`.' },
	E_DELIVERY_FAILED: { meaning: 'File or Aria delivery failed.', recovery: 'Check the destination, permissions, and downstream command output.' },
	E_ARIA_UNAVAILABLE: { meaning: 'Aria capture intake is unavailable.', recovery: 'Install or update Aria after clip.capture.v1 ships, or use `--save`.' },
	E_SETUP_FAILED: { meaning: 'Browser setup could not open a verified installation surface.', recovery: 'Run `clip setup --dry-run --json`, inspect each browser state, and use only its verified route.' },
	E_CANCELLED: { meaning: 'The operation was cancelled or timed out.', recovery: 'Retry when ready or raise the relevant timeout.' },
	E_INTERNAL: { meaning: 'An internal invariant failed.', recovery: 'Run with `--json`, retain the error code, and report a reproducible command.' },
} as const satisfies Record<ErrorCode, ErrorDoc>;

export function exitFor(stage: Stage): ExitCode {
	return EXIT_BY_STAGE[stage];
}

export class Fault extends Error {
	readonly detail: ClipError;
	readonly exit: ExitCode;
	readonly effects: string[];

	constructor(detail: ClipError, exit: ExitCode = EXIT_BY_STAGE[detail.stage], effects: string[] = []) {
		super(detail.message);
		this.name = 'Fault';
		this.detail = ErrorSchema.parse(detail);
		this.exit = exit;
		this.effects = effects;
	}
}

export interface FaultOptions {
	hint?: string;
	retryable?: boolean;
	exit?: ExitCode;
	effects?: string[];
}

export function fail(code: ErrorCode, message: string, stage: Stage, options: FaultOptions = {}): never {
	throw new Fault({
		code,
		message,
		hint: options.hint,
		retryable: options.retryable ?? false,
		stage,
	}, options.exit, options.effects);
}

export function failure(fault: Fault) {
	return FailureSchema.parse({
		schemaVersion: PROTOCOL,
		ok: false,
		error: fault.detail,
		sideEffects: fault.effects,
	});
}

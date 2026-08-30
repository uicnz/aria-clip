# CLI architecture and release

The CLI is an installable product surface over Aria Clip's environment-independent pipeline. Authored source is TypeScript; `dist/cli.cjs` and `dist/api.mjs` are generated JavaScript artifacts. Bun 1.4 or later is canonical, and the CLI bundle is also compiled for Node 24 or later.

## Source model

| Area | Responsibility |
| --- | --- |
| `src/api/` | Environment-independent extraction, rendering, and template API. |
| `src/cli/` | Parsing, registry, help, orchestration, protocols, configuration, and Node/Bun adapters. |
| `src/core/interpreter/` | Shared provider transport used by the browser and CLI. |
| `src/schemas/` | Zod-owned external and persisted contracts. |
| `src/integrations/aria/` | Browser native messaging and CLI process delivery. |
| `scripts/build-cli.ts` | Produces the executable Node-compatible CommonJS bundle. |
| `scripts/package-cli.ts` | Stages and packs the publishable npm tarball. |
| `scripts/test-cli-package.ts` | Installs and executes the real packed command with Bun and Node 24+. |

`package.json` is the sole version source. The CLI imports it through `src/cli/version.ts`; build scripts do not maintain another version literal.

`providers.json` is the sole provider catalog. `src/schemas/model.ts` validates it, and both browser and CLI resolution use its provider IDs, API adapters, endpoints, credential environment names, and model suggestions. Provider payload or response handling belongs in the shared interpreter client, never in an entry point.

`~/.aria/.env` is the sole file-backed environment source. `src/platform/node/env.ts` owns its resolution and is shared by the CLI and repository scripts. Do not add repository, working-directory, or system-path `.env` discovery. Explicit process variables remain available for CI injection and take precedence over the file.

## Public protocols

The stable protocol version is independent of the package version. Owning Zod schemas cover results, failures, JSONL events, capabilities, command descriptions, templates, capture envelopes, and capture acknowledgements.

```sh
aria-clip describe --json
aria-clip schema result --json
aria-clip schema capture --json
aria-clip schema capture-ack --json
```

Do not add an unvalidated external payload. Parse `unknown` at its trust boundary and infer the TypeScript type from the owning schema. New CLI code must not introduce `any`.

## Add to Aria contract

Aria Clip emits `CaptureSchema` version 1. It includes complete source, extraction, rendering, properties, resources, and Location data. The browser sends it to native host `nz.uic.aria.clip`. The CLI uses a noninteractive process contract:

```text
aria --supports clip.capture.v1
aria clip add --input - --json
```

The second command receives one capture envelope on stdin and must return one `CaptureAckSchema` document on stdout. A positive acknowledgement provides stable `identity` and resolved `destination`; a negative acknowledgement provides `code`, `message`, and `retryable`.

This is the consumer contract prepared for the incoming Aria implementation. Until Aria advertises the capability, `--add` returns `E_ARIA_UNAVAILABLE` without mutation. Do not add a silent URI or GUI fallback. The Aria deep-link protocol is outside this RFC and outside the CLI intake architecture.

## Verification

```sh
bun run typecheck
bun run test
bun run test:package
```

Deterministic CLI tests use local HTML, local HTTP servers, mocked model providers, isolated filesystems, and a fake Aria process. Package tests install the tarball into a clean directory, verify the Bun shebang and executable bit, execute help and schemas, and capture a local fixture with both Bun and Node 24+.

The `CLI` GitHub workflow runs type checking, CLI protocol tests, and the real package test on macOS, Linux, and Windows.

## Package output

```sh
bun run package:cli
```

Output:

```text
builds/npm/aria-clip-<version>.tgz
```

The archive contains only the staged package files selected by `scripts/package-cli.ts`. It does not contain `.git`, source history, browser builds, credentials, or local configuration.

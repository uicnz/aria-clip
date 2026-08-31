---
permalink: clip/cli
description: Capture, interpret, inspect, and deliver Markdown with the Aria Clip command line.
---

# Command line

`aria-clip` is a supported headless interface to the same extraction, template, artifact, and Location semantics used by the extension. `clip` is an equal, shorter executable name backed by the same bundle. Bun is the canonical runtime; the generated bundle also supports Node 24 or later.

## Start safely

```sh
clip https://example.com/article
```

The bare URL form uses **Default**, makes no model request, writes no file, and prints Markdown to standard output.

```sh
aria-clip https://example.com/article --save
aria-clip paper https://arxiv.org/html/1706.03762 --json
aria-clip auto https://example.com --dry-run
clip video https://www.youtube.com/watch?v=zMvBMfj4cSQ
```

`--save` preserves the template's rendered relative `path` beneath `${ARIA_HOME}/vault/` and appends the sanitized artifact filename. `ARIA_HOME` defaults to `~/.aria`. Interpretive commands such as `paper`, `news`, and `video` contact the configured model unless `--dry-run` is present. `auto` may choose an interpretive template when its trigger is unambiguous.

## Discover without source access

```sh
aria-clip help agent
aria-clip describe --json
aria-clip capabilities --json
aria-clip templates list --json
aria-clip models list --json
aria-clip schema result --json
aria-clip schema capture --json
```

`--json` emits exactly one versioned document. `--jsonl` emits independent stage events followed by the terminal result or failure. Machine clients should read standard output and use the nonzero exit code plus stable `error.code`; human diagnostics use standard error.

## Models

Configure a default reference as `provider/model`:

```sh
aria-clip models configure openai/gpt-5.6-sol
aria-clip models test openai/gpt-5.6-sol
```

Resolution order is `--model`, the template's model, the configured default, then one unambiguous configured model. The CLI automatically loads its one file-backed environment from `~/.aria/.env`; it does not search the repository or working directory for another `.env` file. The packaged provider catalog defines each credential name; run `aria-clip config show` to inspect them. The overlapping Aria providers use the exact same variables: OpenAI uses `OPENAI_API_KEY`, Anthropic uses `ANTHROPIC_API_KEY`, Google Gemini uses `GOOGLE_API_KEY`, and xAI uses `XAI_API_KEY`. Ollama requires no key. Keys are never accepted as ordinary arguments or printed by discovery commands.

## Delivery

```sh
aria-clip <url>                         # stdout
aria-clip <url> --save                  # ~/.aria/vault/<template folder>/<filename>
aria-clip <url> --save ./notes/item.md  # explicit local path
aria-clip <url> --add --dry-run         # resolve without mutation
aria-clip <url> --add                   # capability-gated Aria intake
```

Bare `--save` honors the template's vault-relative `path` (shown as Folder) beneath `${ARIA_HOME}/vault/`. It does not infer a folder from the command or artifact. An explicit `--save <path>` remains an exact filesystem override. File writes are atomic and refuse an existing target unless `--overwrite` is explicit. `--add` requires an installed Aria that advertises `clip.capture.v1`; until the receiving Aria release includes that intake, it fails clearly and suggests `--save`. Deep-link delivery is not part of the Add to Aria contract.

Use `--trace <path>` for a redacted execution trace. It omits page HTML, prompt bodies, provider payloads, URL credentials, query strings, and fragments. A dry run does not write a trace.

## Configuration paths

```sh
aria-clip config path
aria-clip config show
```

The default configuration is `~/.aria/clip/config.json`; user templates live in `~/.aria/clip/templates`. `ARIA_HOME`, `ARIA_CLIP_CONFIG`, and an explicit `--config` can change those locations. The CLI never trusts project-local configuration automatically.

## Build and install locally

```sh
bun run package:cli
bun add --global ./builds/npm/aria-clip-<version>.tgz
```

A clean installation can capture with templates and AI without any browser
extension. Interpreter transforms require a configured model and its matching
credential in `~/.aria/.env`.

## Optional browser setup

```sh
clip setup --dry-run --json
clip setup
```

Setup detects supported browsers and opens only a verified public distribution
surface. Chrome, Firefox, and Safari retain their vendor confirmation screens,
but the public CLI workflow stays the same. An opened surface is reported as
`confirmation-required`, never as proof that the extension was installed.

The package contains the generated executable bundle and public API, not repository history.

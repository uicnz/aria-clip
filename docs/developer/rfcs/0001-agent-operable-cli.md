# RFC 0001: Agent-operable CLI

- Status: Implemented
- Date: 30 August 2026
- Owners: Aria Clip maintainers
- Released in source: 0.3.0

## Summary

Aria Clip will ship a proper `aria-clip` command that can be installed and operated without access to the repository or source code. It will serve people and software agents through the same command model:

```text
Extract → Render → Interpret → Deliver
```

The paved road will require one obvious command. Advanced stages will remain independently addressable. Human output will be concise, polished, contextual, and progressively disclosed. Machine output will use stable versioned JSON, deterministic exit codes, and a self-describing command manifest.

The CLI will not be a browser entry point bundled behind a shell command. It will be a supported product surface over an environment-independent Aria Clip pipeline.

## Decision

The next CLI will provide:

1. A useful zero-configuration default: `aria-clip <url>` captures clean Markdown to standard output.
2. Semantic sugars such as `aria-clip paper <url>` and `aria-clip video <url>` that select the correct built-in template and perform the expected interpretation.
3. Explicit delivery sugars: `--save` writes a Markdown file and `--add` sends the result to Aria.
4. Embedded built-in templates. A user will not need to find or author template JSON before the first run.
5. A help system designed as the primary user interface, with concise top-level help, topic help, contextual examples, an agent guide, and complete advanced help.
6. A machine interface based on `--json`, `--jsonl`, `describe`, `capabilities`, and versioned JSON Schemas.
7. Real Interpreter execution with explicit model selection, safe credential handling, and no silent remote requests.
8. Explicit, inspectable side effects. Standard output remains pure data; diagnostics use standard error.
9. Installable package artifacts that expose an executable command without requiring a source checkout.
10. End-to-end tests for packaging, extraction, templates, interpretation, output, and Aria delivery.

## Motivation

The current CLI proves that shared extraction is possible, but it is not a complete product:

- Running `src/cli/index.ts` directly imports browser-only modules and fails before argument parsing.
- The supported polyfills and Node aliases exist only in the build script.
- A template path is mandatory even though built-in templates exist in the application.
- Browser-synchronized templates and settings are unavailable.
- The Node storage stub disables Interpreter, so prompt templates do not produce interpretations.
- The current shared API passes a document element to Defuddle rather than the complete document; fixture testing shows missing title, content, and schema metadata.
- CLI trigger precedence is implemented separately from browser trigger precedence.
- The generated local bundle is not executable without invoking it through Bun.
- The normal browser build does not build or verify the CLI.
- There are no dedicated CLI integration or package-installation tests.
- Static HTTP fetching cannot reproduce authenticated, JavaScript-rendered, selected, highlighted, or browser-adapted page state, but the limitation is not surfaced clearly.
- `aria-clip` and the downstream `aria` command have distinct responsibilities that are not adequately explained.

These are architectural gaps rather than reasons to remove the CLI. A headless Aria Clip is useful for agents, automation, bulk capture, pipelines, testing, scheduled jobs, and the Aria application itself.

## Goals

### Immediate usefulness

A freshly installed CLI must successfully capture a public page without configuration, a template file, or repository knowledge.

### No cognitive load

The CLI should answer these questions before a user needs to ask them:

- What can it do?
- What is the shortest successful command?
- Which actions contact a model provider?
- Which actions write a file or modify Aria?
- Which template and model will be used?
- Where will the result go?
- How can an agent request structured output?
- How can a failure be corrected?

### Agent operability

An agent with only the executable must be able to discover the command surface, obtain schemas, inspect runtime capabilities, execute without prompts, distinguish diagnostics from results, and recover from errors programmatically.

### Product alignment

Extraction, template matching, rendering, interpretation, artifact naming, and Location semantics must use the same core implementations as the browser extension.

### Safe automation

Network access, model calls, file writes, overwrites, and Aria mutations must be visible and intentional. A typo must never turn a preview into a mutation.

## Non-goals

The first release will not:

- emulate a complete browser;
- inherit cookies or sessions from an installed browser;
- execute arbitrary remote page JavaScript;
- implement or invoke Aria's separate deep-link protocol;
- expose API keys in arguments, logs, JSON, or process listings;
- make MCP the primary implementation;
- guarantee that every website can be extracted through static HTTP.

The stable CLI protocol can support a later MCP adapter without changing the core pipeline.

## Product vocabulary

The two executable names must remain explicit:

- `aria-clip` fetches, extracts, renders, optionally interprets, and coordinates delivery.
- `aria` is the downstream local application command that creates or updates notes.

Help and errors must never refer to them interchangeably.

## Command model

### Paved road

The shortest command performs a deterministic Default capture and prints Markdown:

```sh
aria-clip https://example.com/article
```

Equivalent canonical form:

```sh
aria-clip capture https://example.com/article --template default --to stdout
```

The bare URL form must never trigger an external model request or write outside standard output.

### Semantic sugars

Interpretive built-ins receive memorable commands:

```sh
aria-clip summary  <url>
aria-clip news     <url>
aria-clip research <url>
aria-clip paper    <url>
aria-clip recipe   <url>
aria-clip tutorial <url>
aria-clip video    <url>
aria-clip product  <url>
aria-clip travel   <url>
aria-clip event    <url>
aria-clip person   <url>
aria-clip code     <url>
```

Each sugar expands through the same command registry. For example:

```text
paper <url>
  = capture <url> --template paper-notes --interpret
```

The expansion is inspectable:

```sh
aria-clip paper --explain
```

This prints the canonical command, selected template, model-resolution order, network activity, and default destination without executing the capture.

### Delivery sugars

Delivery is orthogonal to transformation:

```sh
# Print the artifact
aria-clip paper <url>

# Save using the sanitized artifact filename
aria-clip paper <url> --save

# Save to an explicit path
aria-clip paper <url> --output ./notes/paper.md

# Add using the template's Location semantics
aria-clip paper <url> --add

# Resolve all stages and destinations without side effects
aria-clip paper <url> --add --dry-run
```

Canonical delivery syntax is `--to stdout`, `--to file`, or `--to aria`. `--save` and `--add` are sugars. The existing `--open` flag becomes a documented compatibility alias for `--add` during one deprecation cycle.

### Auto mode

Auto mode is explicit because it can select an interpretive template:

```sh
aria-clip auto <url>
```

It performs trigger matching and:

- uses Default for pages without an unambiguous trigger;
- uses the matching built-in or user template otherwise;
- interprets only when the selected template requires it;
- reports the selected template and model on standard error in human mode;
- includes the complete selection decision in JSON mode.

The plain `aria-clip <url>` form remains deterministic and model-free.

## Progressive help

Help is a first-class interface generated from the same command registry used by parsing and machine description. Parser behavior, examples, human help, and JSON command descriptions must not drift independently.

### Top-level help

`aria-clip --help` should fit comfortably in a normal terminal without scrolling. It should put successful commands above reference material:

```text
ARIA CLIP
Capture the web as durable Markdown.

Usage
  aria-clip <url> [options]
  aria-clip <transform> <url> [options]
  aria-clip <command> [options]

Start here
  aria-clip <url>               Capture clean Markdown
  aria-clip <url> --save        Save a sanitized .md file
  aria-clip <url> --add         Add the capture to Aria
  aria-clip paper <url>         Create rigorous paper notes
  aria-clip video <url>         Create structured video notes
  aria-clip auto <url>          Choose an unambiguous template

Discover
  help <topic>                  Show focused help
  help agent                    Instructions for software agents
  templates                     List available templates
  capabilities                 Show what works in this environment
  doctor                        Diagnose configuration and delivery

Common options
  --save                        Save using the artifact filename
  --add                         Deliver through the Aria CLI
  --model <provider/model>      Override the configured model
  --json                        Return one structured result
  --dry-run                     Resolve without writing or delivering

More
  aria-clip help transforms
  aria-clip help delivery
  aria-clip help configuration
  aria-clip --help=all
```

The real renderer may use restrained ANSI styling, but useful information must remain above decoration.

### Help levels

- `aria-clip --help` provides the paved road.
- `aria-clip <command> --help` documents one command and its common examples.
- `aria-clip help <topic>` explains transforms, templates, models, delivery, configuration, input, security, and automation.
- `aria-clip help agent` provides a compact, self-contained operating guide suitable for an agent context window.
- `aria-clip --help=all` prints every command and advanced option.
- `aria-clip explain <error-code>` explains a stable error and gives recovery commands.

### Contextual errors

Human errors must include the failed assumption and one directly executable correction:

```text
No model is configured for Paper Notes.

Try one of these:
  aria-clip models configure
  aria-clip paper <url> --model openai/gpt-5.6-sol

Nothing was sent to a model and no file was written.
Error: E_MODEL_NOT_CONFIGURED
```

Unknown commands and options should offer spelling suggestions. Invalid input must fail before fetching a URL or contacting a provider.

### Presentation quality

Human output should use:

- bold section labels;
- gray secondary explanations;
- green success, amber warning, and red failure states;
- aligned option descriptions that reflow at narrow terminal widths;
- terminal hyperlinks only when supported;
- symbols sparingly, with ASCII fallbacks;
- `NO_COLOR` and `TERM=dumb` support;
- no oversized banner, animation, or decorative output in noninteractive contexts.

Shell completions will be available for zsh, bash, and fish through `aria-clip completions <shell>`.

## Agent interface

### Agent guide

`aria-clip help agent` must be sufficient to operate the installed CLI without source access. It will state:

1. The safe default command.
2. The difference between deterministic and interpretive commands.
3. How to discover templates and models.
4. How to request JSON.
5. Which flags cause writes or Aria mutations.
6. How standard output and standard error are used.
7. The exit-code families.
8. How to dry-run delivery.
9. How to retrieve command and result schemas.

The guide must be concise enough to place directly into an agent context.

### Self-description

Static command metadata is discoverable without network access:

```sh
aria-clip describe --json
aria-clip describe capture --json
aria-clip schema result --json
aria-clip schema error --json
aria-clip examples --json
```

`describe` returns commands, arguments, options, defaults, conflicts, implications, side effects, examples, and the schema version. This is generated from the command registry rather than maintained as parallel prose.

### Runtime capabilities

Environment-dependent state is separate from static description:

```sh
aria-clip capabilities --json
```

It reports:

- CLI and protocol versions;
- available built-in and user templates;
- configured providers and models, with credentials represented only as booleans;
- static-fetch and HTML-input support;
- availability and version of the downstream `aria` command;
- the active config and template directories;
- supported delivery methods;
- platform and runtime;
- disabled or unavailable features with reasons.

### Structured result

`--json` writes exactly one JSON document to standard output. Progress and diagnostics never contaminate it.

```json
{
  "schemaVersion": "1",
  "ok": true,
  "command": "paper",
  "input": {
    "requestedUrl": "https://arxiv.org/html/1706.03762",
    "finalUrl": "https://arxiv.org/html/1706.03762",
    "source": "network"
  },
  "template": {
    "id": "builtin-paper-notes",
    "name": "Paper Notes",
    "artifact": "paper-notes",
    "hash": "sha256:..."
  },
  "interpreter": {
    "performed": true,
    "provider": "openai",
    "model": "gpt-5.6-sol"
  },
  "artifact": {
    "title": "Attention Is All You Need",
    "fileName": "attention-is-all-you-need.paper-notes.md",
    "mediaType": "text/markdown",
    "markdown": "---\ntitle: ..."
  },
  "delivery": {
    "requested": "stdout",
    "performed": false
  },
  "warnings": [],
  "timingMs": {
    "total": 1421
  }
}
```

Large extraction internals are omitted by default and can be requested with `--include source`, `--include variables`, or `--include trace`.

### Event stream

`--jsonl` emits versioned events for long-running interpretation and delivery:

```text
started → fetched → extracted → matched → rendered → interpreting → interpreted → delivering → completed
```

Each line is independently valid JSON. The terminal event contains the same result or error envelope as `--json`. Event names are additive within a protocol version; consumers must ignore unknown events.

### Error contract

Machine errors use standard error for human diagnostics only when JSON was not requested. In JSON modes, the structured error is written to standard output and process failure is still represented by a nonzero exit code.

```json
{
  "schemaVersion": "1",
  "ok": false,
  "error": {
    "code": "E_MODEL_NOT_CONFIGURED",
    "message": "Paper Notes requires an Interpreter model.",
    "hint": "Run `aria-clip models configure` or pass `--model provider/model`.",
    "retryable": false,
    "stage": "interpret"
  },
  "sideEffects": []
}
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `2` | Invalid command, argument, configuration, or template. |
| `3` | Fetch or input failure. |
| `4` | Extraction or source-adapter failure. |
| `5` | Template matching or rendering failure. |
| `6` | Interpreter, provider, model, or credential failure. |
| `7` | File or Aria delivery failure. |
| `8` | Required capability is unavailable in this environment. |
| `9` | Operation timed out or was cancelled. |
| `10` | Internal invariant failure. |

Stable symbolic error codes provide finer resolution. Exit-code meanings cannot change within a major CLI version.

## Pipeline

### Extract

The source stage accepts:

- an HTTP or HTTPS URL;
- an HTML file through `--html <path>`;
- HTML from standard input through `--html -`;
- a previously saved extraction envelope through `--input <path|->`.

Static network fetches record the requested URL, final URL, redirect chain, content type, byte count, fetch timestamp, and input hash.

Private and loopback network destinations are denied by default to reduce server-side request forgery risk when an agent handles untrusted URLs. `--allow-private-network` is an explicit advanced override. Response-size and timeout limits are enforced before parsing.

Pages requiring browser authentication or client-side rendering fail with an actionable `E_BROWSER_REQUIRED` or `E_CONTENT_UNAVAILABLE` rather than silently producing an empty artifact. A later browser bridge may provide authenticated page state through native messaging.

Source-specific adapters, including arXiv metadata and supported video extraction, sit above the shared fetch layer and are reused by browser and CLI environments.

### Render

Rendering uses one shared template engine and trigger matcher. The CLI must not maintain its own precedence implementation.

Template resolution order is:

1. explicit `--template-file`;
2. explicit `--template <id>`;
3. semantic sugar;
4. auto matching when requested;
5. Default.

Every result records template ID, artifact, source, version, and content hash. Prompt-bearing templates cannot silently remove their prompt. They either proceed through Interpret or return an actionable error.

### Interpret

Interpretation occurs only when:

- an interpretive semantic sugar is used;
- `--interpret` is explicit;
- `auto` selects an interpretive template.

The selected prompt and source context remain distinct in the execution envelope. The final interpretation becomes the artifact body according to the same save contract used by the browser.

Model resolution order is:

1. `--model <provider/model>`;
2. template model override, if present;
3. configured CLI default;
4. a single unambiguous configured model;
5. fail with `E_MODEL_NOT_CONFIGURED`.

No provider is contacted merely to render help, describe commands, inspect capabilities, match templates, or dry-run delivery.

### Deliver

Delivery defaults to standard output and no mutation.

File delivery:

- uses the shared filename sanitizer;
- writes atomically;
- refuses an existing target unless overwrite is explicit;
- returns the absolute final path and content hash.

Aria delivery:

- invokes the downstream `aria` command as the canonical noninteractive integration;
- transmits Behavior, rendered Note name, Folder, Vault, artifact, properties, source, and Markdown;
- supports create, append, prepend, overwrite, append daily, and prepend daily;
- fails when the installed `aria` does not advertise `clip.capture.v1`;
- has no deep-link or GUI fallback;
- returns Aria's stable note identity and resolved destination when available.

`--dry-run` resolves the complete delivery plan but cannot write, invoke `aria`, access the clipboard, or contact an Interpreter provider.

## Templates

Built-in templates are compiled into the CLI artifact from the same authored definitions used by the extension.

Commands include:

```sh
aria-clip templates list
aria-clip templates show paper-notes
aria-clip templates match <url>
aria-clip templates validate <file>
aria-clip templates import <file>
aria-clip templates export <id>
```

Human output provides names and short purposes. JSON output provides IDs, artifacts, triggers, interpretation requirements, Location defaults, and schema versions.

User templates live under `${ARIA_HOME}/clip/templates`, where `ARIA_HOME` defaults to `~/.aria`. An explicit `--template-file` always works independently of that directory.

## Configuration and credentials

Configuration precedence is:

1. command-line flags;
2. environment variables;
3. an explicit `--config` file;
4. `${ARIA_HOME}/clip/config.json`;
5. built-in defaults.

The CLI does not automatically trust configuration from the current project directory.

Configuration commands include:

```sh
aria-clip config path
aria-clip config show
aria-clip config set default-model openai/gpt-5.6-sol
aria-clip models list
aria-clip models test openai/gpt-5.6-sol
aria-clip doctor
```

`config show`, capabilities, traces, and errors redact secrets. Provider credentials come from provider-specific environment variables or operating-system credential storage. Raw API keys are not accepted as ordinary command arguments.

## Architecture

### Environment-independent pipeline

The core pipeline must have no transitive dependency on browser storage, `webextension-polyfill`, browser globals, or UI state. Environment services are injected:

```ts
interface RuntimeServices {
  fetch: SourceFetcher;
  parseDocument: DocumentParser;
  templates: TemplateRepository;
  interpreter: InterpreterService;
  delivery: DeliveryService;
  clock: Clock;
}
```

Browser and CLI adapters implement the same interfaces. Prompt processing must not read a module-level browser setting to decide whether a prompt exists.

### Schema and type policy

Zod schemas own every external or persisted shape, including configuration, templates, provider payloads, command inputs, results, errors, events, capabilities, and delivery envelopes. TypeScript types are inferred from those schemas rather than maintained as parallel declarations.

Domain choices use literal unions or enums rather than unconstrained strings. New code must not introduce `any`. `unknown` is permitted only at an unavoidable trust boundary and must be parsed or narrowed immediately. Existing unsafe casts encountered while building the shared pipeline are removed rather than propagated into the CLI.

Symbols and files remain terse within their domain taxonomy. Names expand only when the shorter form is genuinely ambiguous at an integration boundary.

### Proposed source layout

```text
src/cli/
  main.ts
  registry.ts
  help/
  commands/
    capture.ts
    inspect.ts
    templates.ts
    models.ts
    deliver.ts
    doctor.ts
    describe.ts
  protocol/
    result.ts
    errors.ts
    events.ts
    schemas.ts
  adapters/
    node-fetch.ts
    linkedom.ts
    file-delivery.ts
    aria-delivery.ts
  config/

src/core/pipeline/
  extract.ts
  render.ts
  interpret.ts
  deliver.ts
  run.ts
```

The exact directory names can evolve, but command registration, help metadata, machine description, validation, and sugar expansion must share one declarative registry.

### Runtime and packaging

Bun is the canonical package manager, build runner, test runner, and CLI runtime. The installed command uses a Bun shebang. Its emitted JavaScript remains explicitly compatible with Node 24 or later for environments that invoke the bundle through Node; earlier Node releases are unsupported.

The package build must:

- emit an executable `dist/cli.cjs`;
- include built-in templates, help topics, and JSON Schemas;
- include only required runtime dependencies;
- verify the package contents before publication;
- take its version exclusively from `package.json`.

Supported installation:

```sh
npm install --global aria-clip
# or
bun install --global aria-clip
```

GitHub releases may add compiled standalone binaries after the package path is stable. Standalone artifacts must pass the same protocol and behavior suites.

## Test strategy

### Unit tests

- argument parsing and conflicts;
- sugar expansion;
- help generation and terminal-width wrapping;
- command description and JSON Schema validation;
- exit-code and symbolic-error mapping;
- config precedence and secret redaction;
- trigger precedence;
- delivery planning;
- private-network protection.

### Deterministic integration tests

- local HTML fixtures for ordinary articles, schema-rich pages, arXiv papers, video metadata, selectors, malformed pages, and empty pages;
- golden Markdown, properties, filenames, and JSON envelopes;
- fixture HTTP server for redirects, content types, timeouts, size limits, and HTTP failures;
- mocked provider server for interpretation, streaming, rate limits, malformed responses, and authentication failures;
- fake `aria` executable that records argument arrays without touching a vault;
- file-delivery tests in isolated temporary directories;
- stdin/stdout/stderr separation.

### Package tests

CI builds a package tarball, installs it into a clean temporary environment, and verifies:

```sh
aria-clip --version
aria-clip --help
aria-clip help agent
aria-clip describe --json
aria-clip capabilities --json
aria-clip <fixture-url> --json
```

The package test must fail if the executable bit, shebang, runtime dependency, built-in template, help topic, or schema is missing.

### Optional live tests

Network smoke tests run separately and do not gate deterministic CI. They cover a small allowlist such as arXiv and a static public article. Failures are reported as environmental rather than allowed to weaken fixture coverage.

### Cross-platform tests

The install, help, capture, JSON, file, and fake-Aria suites run on macOS, Linux, and Windows. Terminal presentation has snapshots for color, no-color, narrow width, and redirected output.

## Observability and reproducibility

Every structured result can include:

- CLI and protocol versions;
- requested and final URLs;
- source and output hashes;
- fetch timestamp;
- template ID, version, artifact, and hash;
- provider and model IDs;
- stage timings;
- warnings and adapter decisions;
- resolved delivery plan.

`--trace` writes a redacted trace to a caller-selected file. It does not change standard output. Raw HTML and provider payloads require separate explicit include flags because they may contain private information.

## Compatibility

The first proper release retains the current core flags where their meaning is safe:

- `--template <path>` is accepted as an alias for `--template-file <path>` when the value resolves to a file or directory.
- `--output <path>`, `--html`, `--vault`, and `--property-types` remain supported.
- `--open` maps to `--add` with a deprecation notice in human mode.
- deep-link delivery is intentionally outside this CLI contract.

Compatibility aliases appear in `--help=all`, not the paved-road help.

## Implementation phases

### Phase 1: Make the core honest

1. Pass a complete document to Defuddle and add regression fixtures.
2. Remove transitive browser imports from the shared API.
3. Inject prompt, settings, fetch, and delivery services.
4. Unify browser and CLI trigger matching.
5. Define result, error, event, and capability schemas.

### Phase 2: Build the paved road

1. Introduce the declarative command registry.
2. Implement bare URL capture and embedded Default.
3. Implement progressive help, `describe`, `capabilities`, and `doctor`.
4. Implement clean stdout/stderr contracts and exit codes.
5. Package-install smoke tests.

### Phase 3: Add semantic transforms

1. Embed every built-in template.
2. Add semantic sugars and inspectable expansion.
3. Implement provider configuration and Interpreter execution.
4. Add mocked-provider and golden-artifact tests.

### Phase 4: Complete delivery

1. Implement atomic file delivery.
2. Finalize the Add to Aria envelope and downstream CLI contract.
3. Add dry-run, conflict, overwrite, daily-note, and fake-Aria tests.
4. Deprecate ambiguous legacy flags.

### Phase 5: Distribution polish

1. Publish the installable package.
2. Generate shell completions.
3. Add release provenance and checksums.
4. Evaluate standalone executables for GitHub releases.
5. Add an MCP wrapper only if it can remain a thin adapter over the stable CLI protocol.

## Acceptance criteria

The RFC is implemented when all of the following are true:

- A user can install the package and run `aria-clip <url>` without source access or a template file.
- Top-level help exposes a successful command, transformations, delivery, discovery, and agent help without scrolling at 80×24.
- `aria-clip help agent` is sufficient for a capable agent to perform a safe capture and an explicit delivery.
- Human and machine help are generated from the parser's command registry.
- Every semantic sugar has a tested canonical expansion.
- Built-ins are available by stable ID and semantic command.
- Prompt templates either execute interpretation or fail clearly; prompts are never silently deleted.
- `--json` and `--jsonl` validate against bundled schemas and contain no diagnostic contamination.
- External and persisted payloads are parsed by their owning Zod schemas, and the CLI introduces no `any` types.
- Stable errors and exit codes identify every pipeline stage.
- A dry run cannot contact a provider or perform delivery.
- File writes are atomic and conflicts are explicit.
- Add to Aria transmits the complete Location contract.
- Credentials and private input are redacted from help, errors, capabilities, and traces.
- Package-install tests execute the real `aria-clip` binary on macOS, Linux, and Windows.
- Deterministic fixtures cover extraction, schema, templates, interpretation, and delivery.
- Browser and CLI paths share extraction, trigger, rendering, artifact, and Location semantics.

## Consequences

This proposal increases the CLI's scope, but removes duplicated and misleading architecture. The browser extension gains a cleaner environment-independent pipeline and better regression coverage. Aria gains a stable capture contract. Agents gain a self-describing tool that can be safely driven without repository knowledge.

The principal cost is treating CLI behavior, help, schemas, and packaging as supported public interfaces. That cost is appropriate: an agent-operable command cannot depend on source inspection or institutional memory.

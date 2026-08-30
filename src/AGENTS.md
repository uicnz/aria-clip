# Source Agreements

`src` contains one product projected through browser entrypoints, the programmatic API, and the CLI.

- Put domain truth in `core`, `features`, `schemas`, or a shared integration. Entrypoints and protocol layers adapt it; they must not fork it.
- When adding a CLI capability, first find the browser implementation and shared owner. When improving a browser capability, propagate the shared semantic to CLI and API in the same concern.
- Provider identities, APIs, model shapes, credential names, and presets come from `providers.json` through `src/schemas/model.ts`. Do not create a second catalog.
- Template, capture, result, config, and persisted settings shapes must be parsed by their canonical Zod schemas.
- Keep extraction, prompt, interpretation, and delivery observable as distinct stages. Stage failures must identify the failed stage and must not manufacture a successful partial artifact.
- Complete source means the full readable body returned by asynchronous Defuddle extraction, including async material such as video transcripts. User selection and explicit custom context are the only intentional narrowing mechanisms.
- Tests for source flow must use beginning, middle, and end sentinels large enough to expose truncation. Assert the final consumer receives them, not merely the producer.

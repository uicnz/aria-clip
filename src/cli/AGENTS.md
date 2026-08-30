# CLI Agreements

The CLI is an agent-operable projection of Aria Clip, not a second implementation.

- Reuse the shared extraction, template, trigger, schema, provider, interpreter, artifact, and delivery modules. If the CLI reveals a better shared implementation, move the improvement to the shared owner and update the extension and API together.
- Load credentials only from the canonical `~/.aria/.env` unless the user explicitly changes `ARIA_HOME`. Never edit or print that file.
- Bare `--save` must render the selected template's exact relative `path` beneath `${ARIA_HOME}/vault`. An explicit output path is the only override.
- JSON and JSONL are stable agent protocols. Keep stdout machine-readable; diagnostics belong on stderr and secrets never belong in either stream.
- Help must use progressive disclosure, stable command sugars, clear remediation, and no source-code knowledge requirement.
- Bun is primary. Packaged compatibility begins at Node 24.

## Required proof

- Unit tests are necessary but not sufficient. Exercise the packaged CLI against real accessible URLs representing affected domains.
- For captures, measure the full source and check beginning and end content. For interpretations, inspect the saved artifact for source-proportional coverage.
- Verify delivery lands at the exact template-relative vault path.
- Run the packaged smoke suite with Bun and Node 24 before claiming the CLI is ready.
- Store or name practical artifacts in the handoff so the user can inspect them. Do not report a dry run as delivery proof.

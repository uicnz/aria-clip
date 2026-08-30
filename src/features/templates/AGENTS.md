# Template Agreements

Templates declare rendering, interpretation, artifact taxonomy, and relative location. They do not own source extraction.

- Every built-in interpreter template context must include the complete `{{content}}` body. Metadata and description may supplement it but never substitute for it.
- `Default` remains a faithful, model-free capture. `Page Summary` is intentionally terse. Other built-ins must request coverage proportional to source breadth and their declared output sections.
- A prompt cannot compensate for missing source. Diagnose and repair source flow before changing prompt verbosity.
- Preserve exact names, dates, numbers, timestamps, attribution, uncertainty, and source-supported structure appropriate to the template.
- Keep `artifactType` kebab-cased and semantically distinct from the `.md` extension. Keep `path` relative to the Aria vault root.
- Built-in changes require a metadata migration. Upgrade only exact known prior built-in prompt, context, trigger, or metadata values; preserve customized values.
- Template triggers must be unambiguous. Do not add a trigger merely to increase automatic matching.

## Required proof

- Parse every built-in prompt and context with the template engine.
- Assert every interpreter context contains and compiles the complete source sentinel.
- Test migrations from the immediately prior metadata version and prove custom values survive.
- Inspect one real output for any materially changed prompt.

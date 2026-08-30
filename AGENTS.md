# Aria Clip Operating Agreements

These instructions are product invariants. Read the closest nested `AGENTS.md` before changing code in that domain.

Scoped agreements supplement this file:

- `src/AGENTS.md`: shared application architecture
- `src/core/clipping/AGENTS.md`: extraction and complete-source flow
- `src/features/interpreter/AGENTS.md`: provider requests and interpretation
- `src/features/templates/AGENTS.md`: built-ins, prompts, triggers, and migrations
- `src/cli/AGENTS.md`: agent protocol, delivery, and practical CLI proof

## Non-negotiable product contracts

1. Capture the complete Defuddle-extracted source before rendering or interpretation. Metadata, prompts, and interpretations are separate projections; none may replace the source.
2. Browser extension, CLI, and API are projections of one application. Reuse the same schemas, provider catalog, templates, extraction, rendering, interpreter, artifact, and delivery semantics. A split-brain implementation is a release blocker.
3. `package.json` is the sole version source. Generated manifests, Xcode metadata, packages, and distributables must derive from it.
4. Source is TypeScript. JavaScript is permitted only as generated distribution output or an unavoidable external boundary.
5. Bun is the development default. Shipped CLI compatibility begins at Node 24. Use Zod at untrusted and persisted-data boundaries. Prefer precise types, avoid `unknown` when a real schema is available, and do not introduce `any`.
6. Keep symbols and filenames terse when taxonomy already supplies context. Expand only to remove real ambiguity.
7. The canonical environment file is `~/.aria/.env`. Read it without exposing values and never edit it.

## Regression policy

- Fix a violated invariant at its earliest shared owner. Do not conceal missing input with a stronger prompt, downstream fallback, or more verbose output.
- Never silently downgrade complete extraction, interpretation, delivery, or persistence to a partial result. Fail clearly and preserve evidence.
- Preserve user-authored templates, settings, documentation, and unrelated worktree changes. Built-in migrations may update only an exact known prior built-in value.
- A greenfield repository permits direct schema improvement; it does not permit deleting behavior or changing semantics without understanding every caller.

## Truthful handoff gate

Never say a change is working, fixed, complete, or ready unless the relevant user-visible path was exercised.

Required evidence, in increasing order:

1. Type-checking proves types only.
2. Unit tests prove the tested contracts only.
3. Builds prove compilation and packaging only.
4. A practical run proves behavior: use a real representative URL, execute the actual CLI or extension path, inspect the produced artifact, and assert meaningful content from the beginning, middle, and end of the source.

For shared behavior, test every affected projection. If browser control or another required surface is unavailable, state that limitation explicitly; do not substitute an internal test and describe it as end-to-end. A handoff must name the artifact, command or UI path, and observable evidence. Never hand off a known-empty, implausibly small, or self-disclaiming artifact as acceptable.

Changes to extraction, template context, provider requests, interpretation, or delivery are high risk. Before changing them, preserve a representative working artifact or record its observable source breadth. Afterward, compare a new practical artifact against that baseline. Tests added with the implementation are regression coverage, not independent evidence that existing behavior survived.

## Standard verification

Run the narrow tests while iterating, then use the applicable release gate:

```sh
bun run typecheck
bun test --parallel
bun run build
bun run test:package
```

Warnings are not failures, but they must not hide a failed command. Do not commit or push unless the user asks.

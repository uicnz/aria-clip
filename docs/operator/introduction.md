---
aliases:
  - Aria Clip
permalink: clip
---

# Aria Clip

Aria Clip is an open-source browser extension for turning web pages into durable Markdown. It extracts the useful part of a page, renders it through a template, and then lets you save the result as a file, copy it, or send it to Aria through native messaging.

Aria is optional for file and clipboard workflows. It is required only for **Add to Aria**.

## Mental model

Every capture follows the same pipeline:

1. **Extract** page metadata, readable content, selections, highlights, meta tags, and schema.org data.
2. **Render** those values through the selected template.
3. **Interpret**, when the template contains prompts and the user runs an enabled language model.
4. **Deliver** the finished Markdown using an operation in the footer.

Templates describe inputs and output structure. Operations decide what happens to the rendered result. [Location](location.md) records a template's intended Aria destination, but support varies by delivery path.

## Install

Release artifacts are published from the [GitHub repository](https://github.com/uicnz/aria-clip/releases). Store releases use the same generated browser packages described in the publication runbooks:

- [Chrome](../developer/chrome.md)
- [Firefox](../developer/firefox.md)
- [Safari](../developer/safari.md)

For local Chromium development, run `bun run dev:chrome`, then load `dist/chrome` as an unpacked extension. The value in `package.json` is the canonical application version; the build copies it into generated manifests and the Safari project.

## Guides

- [Capture](capture.md) — extract a page and understand the panel.
- [Highlighter](highlighter.md) — preserve passages and page elements.
- [Interpreter](interpreter.md) — run template prompts through a configured model.
- [Templates](templates.md) — define reusable capture structures and triggers.
- [Location](location.md) — understand Behavior, Note name, Folder, and Vault.
- [Variables](variables.md) — use extracted page values.
- [Filters](filters.md) — transform values.
- [Logic](logic.md) — add conditions, assignments, and loops.
- [Troubleshooting](troubleshoot.md) — diagnose current capture and delivery failures.

## Data boundaries

Extraction and template rendering happen inside the extension. Templates and general settings use browser sync storage; highlights and capture history use local extension storage.

The Interpreter sends its prompt and selected context directly to the provider configured by the user. Where the browser package supports native messaging, **Add to Aria** sends a capture envelope to the local Aria native host only after the user chooses that operation. The current Firefox package supports file and clipboard delivery but does not request native messaging. See [Interpreter](interpreter.md) and the project [privacy policy](https://aria.bot/privacy) before enabling external model processing.

The source is public at [github.com/uicnz/aria-clip](https://github.com/uicnz/aria-clip).

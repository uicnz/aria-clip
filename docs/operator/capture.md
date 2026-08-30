---
permalink: clip/capture
aliases:
  - Capture web pages
---

# Capture

Open Aria Clip from its toolbar icon, a browser shortcut, or a page context menu. The panel extracts the current HTTP or HTTPS page and renders the selected [template](templates.md).

## What becomes the source

Aria Clip uses Defuddle to identify the page's readable content and convert it to Markdown. Extraction also collects metadata, meta tags, schema.org objects, the current selection, and saved highlights.

The `content` input is resolved in this order:

1. Start with the readable page content.
2. If the page has a selection, use the selected content instead.
3. Apply the configured highlight behavior:
   - **Highlight inline** marks saved highlights inside the current content.
   - **Replace page content** uses only the saved highlights.
   - **Do nothing** leaves the current content unchanged.

This affects `{{content}}`; the separate `{{selection}}`, `{{highlights}}`, and full-page variables remain available to templates.

## Panel structure

The panel follows two mental regions: inputs above and operations below.

### Inputs

- **Template** selects the renderer. A matching [trigger](templates.md#triggers) may select it automatically.
- **Page variables** (`{}`) opens a searchable inspector for the current page.
- **Title** previews the rendered note name.
- **Meta** shows the rendered properties.
- **Prompt** shows the template instruction without replacing it after interpretation.
- **Source** shows the context supplied to the Interpreter.
- **Interpretation** appears separately after a model completes.

Large raw variables such as `content`, `contentHtml`, and `fullHtml` are intentionally omitted from the Page variables inspector so the overlay stays useful. They are still valid template variables.

### Operations

The footer contains the selected output operation and its alternatives:

- **Add to Aria** sends a structured capture envelope to Aria's local native host where the browser package supports native messaging.
- **Save file** creates a Markdown download. The browser controls the download folder or save dialog.
- **Copy to clipboard** copies the finished Markdown.
- **Share** uses the platform share surface when available.
- **Interpret** runs a template's prompts before delivery.

The default primary operation is configured under **Settings → General → Save behavior**. The split menu exposes the other operations.

The current Firefox manifest does not request `nativeMessaging`, so Add to Aria is not a supported Firefox delivery path in the current package. Use file or clipboard delivery there.

See [Location](location.md) before relying on a template's Behavior, Folder, or Vault fields; those fields are not applied equally by every operation.

## File names

Downloaded Markdown names are normalized to lowercase filesystem-safe names with dashes instead of spaces. The original title remains unchanged in metadata.

A default capture uses:

```text
attention-is-all-you-need.md
```

After a successful interpretation, a template with artifact `paper-notes` uses:

```text
attention-is-all-you-need.paper-notes.md
```

The dot-delimited artifact is machine-readable taxonomy. It appears only after interpretation completes.

Images remain remote Markdown references during an ordinary file save. Aria Clip gives every generated Markdown image nonempty alt text and wraps image destinations in angle brackets, but it does not download the referenced image files.

## Default shortcuts

| Action | Chrome and Safari on macOS | Chrome on Windows/Linux | Firefox |
| --- | --- | --- | --- |
| Open Clip | `Command+Shift+O` | `Ctrl+Shift+O` | `Alt+Shift+O` |
| Quick clip | `Option+Shift+O` | `Alt+Shift+O` | Not assigned |
| Highlighter | `Option+Shift+H` | `Alt+Shift+H` | `Alt+Shift+H` |
| Reader | `Option+Shift+R` | `Alt+Shift+R` | `Alt+Shift+R` |

Chrome and Firefox expose browser-managed shortcut pages for changing supported mappings. Safari uses the commands declared by the extension.

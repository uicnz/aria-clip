---
permalink: clip/troubleshoot
---

# Troubleshooting

Report reproducible defects at [github.com/uicnz/aria-clip/issues](https://github.com/uicnz/aria-clip/issues). Include the browser, extension version, page URL when it is safe to share, selected template, and the operation that failed.

## A page cannot be captured

Aria Clip operates on normal HTTP and HTTPS pages. Browsers block extensions from some internal pages, extension-store pages, privileged documents, and other restricted origins.

After rebuilding or updating an unpacked extension, reload the extension and then reload any page that was already open. Its earlier content script belongs to the old extension context.

## Content is missing

Defuddle intentionally removes navigation, footers, and unrelated page chrome. On an unusual site it can remove content you wanted.

Try these in order:

1. Select the desired text before opening Aria Clip.
2. Use the [Highlighter](highlighter.md) and choose **Replace page content**.
3. Inspect the `{}` Page variables overlay for useful meta or schema values.
4. Use a selector variable in a site-specific [template](templates.md).
5. Use `{{fullHtml}}` with conservative HTML filters only when the readable extraction is insufficient.

The arXiv enrichment adapter applies specifically to `https://arxiv.org/html/...` pages. PDF pages and unrelated scholarly sites rely on their available metadata and schema.

## The wrong template is selected

Review [trigger precedence](templates.md#match-order). A URL prefix takes precedence over every regex and schema trigger, and the longest matching prefix wins. Regex and schema ties follow template order.

Use specialized triggers only for page types that are genuinely unambiguous.

## Save file ignores Folder or Vault

That is current behavior, not a save-dialog failure. Browser downloads use the rendered note name; the browser chooses the destination. Read [Location](location.md) for the delivery matrix.

## Add to Aria fails

**Add to Aria** requires the native host named `nz.uic.aria.clip`. If the host is absent, unreachable, or rejects the envelope, Aria Clip reports the native messaging error.

Use **Save file** or **Copy to clipboard** as a fallback. Those operations do not require Aria.

The old URI-and-clipboard delivery path is not the current browser implementation. Settings named Legacy mode and Silent open still exist in stored configuration, but the browser's Add to Aria handler currently uses native messaging directly.

## Interpretation fails

Check:

- Interpreter is enabled under Settings.
- The selected model is enabled and has the correct provider and model ID.
- A required API key is present.
- The provider endpoint accepts browser-extension requests.
- The prompt and source fit the provider's context and output limits.
- At least 60 seconds have passed since the last successful interpretation.

The displayed token counts are estimates based on character count, not a provider tokenizer. See [Interpreter](interpreter.md).

For Ollama, start it with browser-extension origins allowed:

```sh
OLLAMA_ORIGINS=moz-extension://*,chrome-extension://*,safari-web-extension://* ollama serve
```

## Highlights do not return

Highlights are stored locally against a normalized URL. They may fail to reattach if the site changed its text or DOM substantially, if the browser profile was cleared, or if the current page resolves to a genuinely different URL.

Export highlights before clearing extension storage or reinstalling.

## Resetting or moving configuration

Before clearing browser extension storage, export settings and any important templates. User templates live in browser sync storage, not as ordinary local files. Highlights and history live in local extension storage and require their own available exports where provided.

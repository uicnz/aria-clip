---
permalink: clip/highlight
aliases:
  - Highlights
  - Highlighter
---

# Highlighter

The Highlighter records passages and page elements before capture. Highlights are kept in local extension storage under a normalized version of the page URL, so they can reappear when the same page is revisited.

URL normalization removes fragments and common tracking parameters such as `utm_*`, `fbclid`, and `gclid`. It does not make unrelated URLs equivalent.

## Turn it on

Use any supported entry point:

- the highlighter icon in the Aria Clip header;
- the browser shortcut;
- the page context menu.

Once active, select text or choose an element on the page. Whether saved highlights remain visible outside active mode is controlled by **Settings → Highlighter → Always show highlights**.

## Capture behavior

**Settings → Highlighter → Clip behavior** controls how saved highlights affect `{{content}}`:

- **Highlight inline** preserves readable content and marks matched passages with `==highlight==`.
- **Replace page content** returns the saved highlight fragments instead of the page body.
- **Do nothing** leaves `{{content}}` unchanged.

The independent `{{highlights}}` variable remains available in every mode. It is structured data, so filters can turn it into custom output:

```twig
{{highlights|map:item => item.text|join:"\n\n"}}
```

## Export and import

Highlighter settings provide JSON export and import. Import merges highlights and removes duplicates rather than replacing all local data.

## Limits

Highlights are matched back onto the current document. A site that rewrites its text or DOM may prevent an older highlight from being located. Restricted browser pages and extension-store pages do not permit normal content-script highlighting.

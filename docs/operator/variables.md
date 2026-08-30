---
permalink: clip/variables
---

# Variables

Variables insert page data into a [template](templates.md). They work in Note name, Folder, properties, note content, and Interpreter context, and can be transformed with [filters](filters.md).

Use `{{name}}` syntax:

```twig
# {{title}}

Source: {{url}}
```

The `{}` button in the capture header opens the Page variables inspector. It is searchable and groups schema values behind compact badges. To keep the overlay responsive, the inspector excludes the large raw values `content`, `contentHtml`, and `fullHtml`; those variables still work in templates.

## Preset variables

| Variable | Value |
| --- | --- |
| `{{author}}` | Extracted author, with metadata and schema fallbacks. |
| `{{content}}` | Readable Markdown after selection and highlight behavior. |
| `{{contentHtml}}` | The corresponding extracted or selected HTML. |
| `{{selection}}` | Current selection as Markdown. |
| `{{selectionHtml}}` | Current selection as HTML. |
| `{{date}}` | Capture time as an ISO timestamp; use the `date` filter for a date-only format. |
| `{{time}}` | Capture time as an ISO timestamp. |
| `{{description}}` | Extracted description or metadata fallback. |
| `{{domain}}` | Page hostname. |
| `{{favicon}}` | Favicon URL. |
| `{{fullHtml}}` | Cleaned full-document HTML, larger than the readable article extraction. |
| `{{highlights}}` | Structured saved highlight records. |
| `{{image}}` | Representative or social-image URL. |
| `{{noteName}}` | Filesystem-safe, lowercase, dash-separated title stem. |
| `{{published}}` | Extracted publication date when available. |
| `{{site}}` | Site or publisher name. |
| `{{title}}` | Original extracted page title. |
| `{{url}}` | Current page URL. |
| `{{language}}` | Extracted page language. |
| `{{words}}` | Readable-content word count. |
| `{{transcript}}` | Extracted transcript when a supported page provides one. |

The original `title` is preserved for metadata. `noteName` is the normalized storage stem.

## Prompt variables

A quoted variable is an Interpreter prompt:

```twig
{{"Summarize the source in three bullets."}}
```

The legacy `{{prompt:"..."}}` form is also recognized, but quoted prompts are the current syntax. Prompt results are deferred until interpretation and may use filters:

```twig
{{"Return only the central claim."|blockquote}}
```

See [Interpreter](interpreter.md) for context, privacy, limits, and structured prompt guidance.

## Model variables

These values exist only after a successful interpretation:

| Variable | Value |
| --- | --- |
| `{{model}}` | Configured display name. |
| `{{modelId}}` | Provider model identifier. |
| `{{modelProvider}}` | Provider name. |

Like prompt variables, they remain deferred during the initial template render.

## Meta variables

Read HTML `<meta>` values by `name` or `property`:

```twig
{{meta:name:description}}
{{meta:property:og:title}}
{{meta:property:og:image}}
```

The first form matches a meta `name`; the second matches a meta `property`.

## Selector variables

Use CSS selectors for site-specific extraction:

```twig
{{selector:.article-title}}
{{selector:a.canonical?href}}
{{selectorHtml:main article}}
```

- `selector:` returns text unless `?attribute` is supplied.
- `selectorHtml:` returns matching element HTML.
- Multiple matches are represented as structured values and can be processed with array filters or loops.

Selectors run in the page and can fail when a site changes its DOM. Prefer preset, meta, or schema variables when they provide the same fact.

## Schema.org variables

Aria Clip flattens JSON-LD and other schema.org data into inspectable keys. Use the schema type and nested path:

```twig
{{schema:@NewsArticle:headline}}
{{schema:@NewsArticle:author[0].name}}
{{schema:@Product:offers.price}}
```

Schema can also select a template through [triggers](templates.md#schemaorg).

## Fallbacks and transformations

Use `??` for a truthy fallback:

```twig
{{schema:@NewsArticle:headline ?? title ?? "Untitled"}}
```

Use filters for formatting:

```twig
{{published|date:"YYYY-MM-DD"}}
{{author|wikilink}}
{{image|image}}
```

For conditions, assignments, arrays, and loops, see [Logic](logic.md).

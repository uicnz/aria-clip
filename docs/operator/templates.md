---
permalink: clip/templates
description: Create reusable page captures with variables, prompts, triggers, and explicit output structure.
---

# Templates

A template is a reusable rendering contract. It defines what a capture is called, which page inputs it uses, what Markdown it produces, and—when configured—what interpretation should run.

Create a template with **Settings → New template**. Select an existing template to edit it. Changes save automatically.

## Fields

### Template

- **Template name** is the human-facing label.
- **Artifact** is a short machine-facing identifier such as `video-notes`. After a successful interpretation it becomes the filename segment before `.md`.
- **Triggers** select the template for unambiguous pages.

### Location

- **Behavior**, **Note name**, **Folder**, and **Vault** describe delivery intent.

These fields do not all affect every output route. Read [Location](location.md) for the exact current behavior.

### Output

- **Properties** render frontmatter values.
- **Note content** renders the Markdown body.
- **Context** controls the source supplied to the Interpreter for this template.

Templates combine [variables](variables.md), [filters](filters.md), and [logic](logic.md). Prompt variables are described under [Interpreter](interpreter.md).

## Built-in templates

The extension ships with Default plus these structured templates:

- Page Summary
- News Brief
- Research Brief
- Recipe Card
- Tutorial Guide
- Video Notes
- Product Brief
- Travel Guide
- Event Details
- Person Profile
- Code Reference
- Paper Notes

Built-ins use conservative triggers only where a content type is unambiguous. A generic article or person page does not force a specialized template.

## Triggers

Enter one trigger per line. A trigger selects a template; it does not run the Interpreter.

### URL prefix

A plain value matches when the current URL starts with it:

```text
https://arxiv.org/html/
```

When more than one plain prefix matches, the longest prefix wins.

### Regular expression

Wrap a JavaScript regular expression in `/` characters. The trigger format does not accept trailing flags:

```text
/^https:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)/
```

### Schema.org

Schema triggers use data embedded in the page:

```text
schema:@Recipe
schema:@Recipe.name
schema:@Recipe.name=Cookie
```

The first form checks the schema type. The second requires a nested property. The third also requires an exact value.

### Match order

The browser evaluates trigger classes in this order:

1. URL prefixes, using the longest matching prefix.
2. Regular expressions, using template order.
3. Schema.org triggers, using template order.

Within regex and schema matches, templates nearer the top of the settings list take precedence. Trigger results are cached briefly for the current URL.

## Storage and portability

Templates are not written as files in `~/.aria`. The browser build stores them in synchronized extension storage, compressed and chunked under internal `template_*` keys.

Use **Export** to download one template as JSON and **Import** to restore it. The **More** menu can also copy template JSON. General settings export creates `aria-clip-settings.json`, which includes the synchronized configuration.

Browser sync storage is convenient, but exported JSON is the portable backup and the appropriate format for version control or moving templates between browser profiles.

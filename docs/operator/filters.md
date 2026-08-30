---
permalink: clip/filters
---

# Filters

Filters transform [variables](variables.md) inside templates:

```twig
{{variable|filter}}
{{variable|filter:argument}}
{{variable|first|upper}}
```

Chains run from left to right. Structured values are represented internally as JSON between filters, so array and object filters can be composed.

## Dates and duration

### `date`

Format a date with Day.js tokens:

```twig
{{published|date:"YYYY-MM-DD"}}
{{"12/01/2024"|date:("YYYY-MM-DD", "MM/DD/YYYY")}}
```

Without an argument, the output format is `YYYY-MM-DD`. An invalid date is returned unchanged.

### `date_modify`

Add or subtract years, months, weeks, days, hours, minutes, or seconds. The result uses `YYYY-MM-DD`:

```twig
{{published|date_modify:"+1 year"}}
{{published|date_modify:"-2 weeks"}}
```

### `duration`

Format an ISO 8601 duration or a number of seconds. Tokens are `HH`, `H`, `mm`, `m`, `ss`, and `s`:

```twig
{{"PT1H30M"|duration:"HH:mm:ss"}}
{{"3665"|duration:"H:mm:ss"}}
```

Without a format, durations under one hour use `mm:ss`; longer durations use `HH:mm:ss`.

## Text case and conversion

| Filter | Result |
| --- | --- |
| `camel` | `camelCase` |
| `capitalize` | Uppercase the first character and lowercase the remainder. |
| `decode_uri` | Decode URI escapes; return the input if decoding fails. |
| `kebab` | `kebab-case` |
| `lower` | Lowercase. |
| `pascal` | `PascalCase` |
| `snake` | `snake_case` |
| `title` | `Title Case` |
| `trim` | Remove surrounding whitespace. |
| `uncamel` | Convert camel or Pascal case to lowercase words. |
| `unescape` | Replace escaped double quotes and `\n`; it is not a general escape decoder. |
| `upper` | Uppercase. |

### `replace`

Replace literal text or a JavaScript regular expression:

```twig
{{title|replace:"old":"new"}}
{{title|replace:("e":"a", "o":"0")}}
{{title|replace:"/[aeiou]/g":"*"}}
```

Supported regular-expression flags are `g`, `i`, `m`, `s`, `u`, and `y`. Multiple replacements run in the supplied order.

### `safe_name`

Remove characters unsafe for a filename:

```twig
{{title|safe_name}}
{{title|safe_name:windows}}
{{title|safe_name:mac}}
{{title|safe_name:linux}}
```

This legacy template filter preserves case and most spaces. It is not the same algorithm used for actual Markdown downloads, which always normalize the filename to lowercase dash-separated text and apply UTF-8 byte limits.

## Markdown formatting

### `blockquote`

Prefix every line with `>`.

### `callout`

Build a Markdown callout:

```twig
{{content|callout:("info", "Summary")}}
{{content|callout:("warning", "Check", true)}}
```

The arguments are type, title, and fold state. A true fold value adds `-` to the callout marker; false adds `+`.

### `footnote`

Convert a JSON array to numbered footnote definitions, or an object to definitions whose IDs are normalized object keys.

### `fragment_link`

Append a text-fragment link back to the current page. The renderer supplies the current URL automatically:

```twig
{{highlights|fragment_link}}
{{highlights|fragment_link:"source"}}
```

For long passages, the fragment uses the first and last five words. Highlight objects keep their fields and receive the link in their `text` value.

### `image`

Create Markdown image syntax:

```twig
{{image|image:"Article image"}}
```

Generated image destinations use angle brackets. Empty alt text is never emitted: without an explicit label, the formatter uses the URL's extension such as `jpg`, or `image` when no extension exists.

Arrays produce multiple images. For an object, each key is the image URL and its value is the alt text.

### `link`

Create Markdown links:

```twig
{{url|link:"Source"}}
```

The default label is `link`. Arrays use the same label for every URL and are joined with newlines. For an object, each key is a URL and its value is the label.

### `list`

Render an array as Markdown:

```twig
{{items|list}}
{{items|list:numbered}}
{{items|list:task}}
{{items|list:numbered-task}}
```

Nested arrays become tab-indented nested lists.

### `table`

Render JSON as a Markdown table. Arrays of objects use object keys as columns. Arrays of arrays become rows. A simple array becomes a one-column `Value` table.

Custom headers are supported:

```twig
{{items|table:("Name", "Value")}}
```

With a simple array, custom headers also determine how values are grouped into rows.

### `wikilink`

Create `[[target]]` or `[[target|alias]]` syntax:

```twig
{{author|wikilink}}
{{author|wikilink:"Profile"}}
```

Arrays produce a JSON array of wikilink strings. For an object, each key is the target and its value is the alias.

## Numbers

### `calc`

Apply one arithmetic operation using `+`, `-`, `*`, `/`, `^`, or `**`:

```twig
{{price|calc:"+10"}}
{{value|calc:"**3"}}
```

Non-numeric input is returned unchanged.

### `number_format`

Format a number with decimal places, decimal marker, and thousands separator:

```twig
{{value|number_format:2}}
{{value|number_format:(2, ".", ",")}}
```

The default is zero decimals, `.` for decimals, and `,` for thousands. Arrays and objects are processed recursively.

### `round`

Round to an integer or a non-negative number of decimal places:

```twig
{{value|round}}
{{value|round:2}}
```

Arrays and objects are processed recursively.

### `length`

Return string length, array length, or the number of object keys.

## HTML

Use HTML filters with `contentHtml`, `fullHtml`, or `selectorHtml:` values.

### `markdown`

Convert HTML to Markdown with Defuddle. When no base URL is supplied, the renderer uses the current page URL so relative links can resolve:

```twig
{{selectorHtml:article|markdown}}
```

### `html_to_json`

Convert HTML into a JSON node tree. Element nodes contain `type`, `tag`, optional `attributes`, and optional `children`; text nodes contain `type: "text"` and `content`.

### `remove_attr`

Remove named attributes while preserving elements and other attributes:

```twig
{{fullHtml|remove_attr:"class,style,id"}}
```

### `remove_html`

Remove elements and all their descendants using CSS selectors:

```twig
{{fullHtml|remove_html:"nav,.advertisement,#footer"}}
```

### `remove_tags`

Remove only named opening and closing tags while preserving their content:

```twig
{{fullHtml|remove_tags:"a,em,strong"}}
```

### `replace_tags`

Rename HTML tags while preserving content and opening-tag attributes:

```twig
{{fullHtml|replace_tags:"strong":"h2"}}
```

### `strip_attr`

Remove every HTML attribute. Supply a comma-separated allowlist to preserve selected attributes:

```twig
{{fullHtml|strip_attr:"href,src,alt"}}
```

### `strip_tags`

Remove every HTML tag while preserving text. Supply an allowlist to keep selected tags:

```twig
{{fullHtml|strip_tags:"p,strong,em"}}
```

This filter also decodes a defined set of common named and numeric HTML entities.

### `strip_md`

Remove common Markdown formatting and return plain text. Images, tables, code blocks, URLs, footnote references, and HTML elements are removed; normal link labels and wikilink labels are preserved. `stripmd` is an alias.

## Arrays and objects

### `first` and `last`

Return the first or last item of a JSON array. Other input is returned unchanged.

### `join`

Join a JSON array. The default separator is a comma:

```twig
{{items|join:", "}}
{{items|join:"\n"}}
```

### `map`

Map array members with a small arrow-expression syntax:

```twig
{{people|map:person => person.name}}
{{people|map:person => ({name: person.name, role: person.role})}}
{{tags|map:item => "topics/${item}"}}
```

Nested property access and array indices are supported. This is not JavaScript, and built-in filters cannot be called inside the map expression.

### `merge`

Append values to a JSON array:

```twig
{{items|merge:("c", "d")}}
```

### `nth`

Keep selected one-based positions:

```twig
{{items|nth:3}}
{{items|nth:3n}}
{{items|nth:n+3}}
{{items|nth:1,2,3:5}}
```

The last form keeps positions 1, 2, and 3 in each group of 5.

### `object`

Convert a JSON object:

```twig
{{value|object:array}}
{{value|object:keys}}
{{value|object:values}}
```

### `reverse`

Reverse a string, a JSON array, or the entry order of a JSON object.

### `slice`

Slice a string or JSON array with JavaScript-style start and exclusive end indices:

```twig
{{content|slice:0,200}}
{{items|slice:1,3}}
{{items|slice:-3}}
```

A one-item array slice is returned as that item rather than a JSON array.

### `split`

Split text into a JSON array:

```twig
{{value|split:","}}
{{value|split:"[0-9]"}}
```

A one-character separator is literal. A longer separator is compiled as a JavaScript regular expression. With no argument, the string is split into characters.

### `template`

Format every item in an object or array and join results with blank lines:

```twig
{{people|template:"- ${name}: ${role}\n"}}
{{tags|template:"- ${str}"}}
```

Nested paths such as `${person.name}` are supported. Empty rendered lines are removed.

### `unique`

Remove duplicate array values. Objects in arrays are compared by their JSON representation. For a JSON object with duplicate values, the last key for each value is retained.

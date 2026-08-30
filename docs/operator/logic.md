---
permalink: clip/logic
description: Use conditionals, fallbacks, assignments, and loops in Aria Clip templates.
---

# Logic

Aria Clip templates support a focused syntax inspired by Twig and Liquid. Logic is evaluated locally before any Interpreter request.

## Conditionals

```twig
{% if author %}
Author: {{author}}
{% endif %}
```

Use `elseif` and `else` for alternatives:

```twig
{% if status == "published" %}
Published
{% elseif status == "draft" %}
Draft
{% else %}
Unknown
{% endif %}
```

### Comparisons

| Operator | Meaning |
| --- | --- |
| `==` | Equal |
| `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `contains` | Case-insensitive substring or array membership |

String equality uses the renderer's JavaScript-style loose comparison. `contains` compares string members case-insensitively and non-string array members by loose equality.

```twig
{% if title contains "review" %}
Review
{% endif %}
```

### Logical operators

| Word | Symbol | Meaning |
| --- | --- | --- |
| `and` | `&&` | Both expressions are truthy. |
| `or` | `\|\|` | Either expression is truthy. |
| `not` | `!` | Negate an expression. |

```twig
{% if (featured or premium) and published %}
Priority item
{% endif %}
```

Apart from the fallback operator described below, binary expressions evaluate both sides before applying the operator. Do not depend on `and` or `or` to suppress evaluation of the right side.

### Truthiness

These values are false in template conditions:

- `undefined` and `null`;
- `false`;
- `0`;
- an empty string;
- an empty array.

Everything else is true, including an empty object.

## Fallbacks

`??` returns the left value when it is truthy; otherwise it evaluates and returns the right value:

```twig
{{schema:headline ?? title ?? "Untitled"}}
```

Despite the familiar symbol, this is a truthy fallback rather than strictly nullish coalescing. `false`, `0`, an empty string, and an empty array all use the fallback.

Filters can be part of either expression:

```twig
{{title|trim ?? "Untitled"}}
```

Use a simple explicit expression when precedence might be hard to read.

## Assignments

`set` creates a local variable for later expressions:

```twig
{% set slug = title|kebab %}
{% set excerpt = content|slice:0,200 %}

Slug: {{slug}}

{{excerpt}}
```

Assignments produce no output. They may use literals, variables, member access, selectors, comparisons, or filters supported by the parser.

## Loops

`for` iterates over an array:

```twig
{% for person in schema:author %}
- {{person.name}}
{% endfor %}
```

If the value is a string containing a JSON array, the renderer parses it first. Undefined and null loop sources produce no output. Any other non-array value records a template error and produces no loop output.

### Loop state

| Variable | Value |
| --- | --- |
| `loop.index` | One-based position. |
| `loop.index0` | Zero-based position. |
| `loop.first` | True on the first item. |
| `loop.last` | True on the last item. |
| `loop.length` | Number of items. |

The compatibility variable `<iterator>_index` also exposes the zero-based position:

```twig
{% for tag in tags %}
{{loop.index}}. {{tag}} ({{tag_index}})
{% endfor %}
```

Each iteration's rendered text is trimmed, and iterations are joined with a newline.

### Member and index access

```twig
{{items[0]}}
{{items[loop.index0]}}
{{user.name}}
{{user["display-name"]}}
```

Schema arrays also support wildcard property access through a schema variable:

```twig
{{schema:author[*].name|join:", "}}
```

### Nested loops

```twig
{% for section in sections %}
## {{section.title}}
{% for item in section.items %}
- {{item}}
{% endfor %}
{% endfor %}
```

## Whitespace control

Add `-` next to a template delimiter to trim adjacent whitespace:

```twig
{%- if author -%}
{{author}}
{%- endif -%}
```

Left trim removes trailing whitespace from the output already produced. Right trim removes leading whitespace, including at most the adjacent newline, from the next output.

## Evaluation order

1. Parse the template into expressions and blocks.
2. Resolve deterministic variables, selectors, filters, assignments, conditions, and loops.
3. Preserve quoted prompts and model variables as deferred expressions.
4. If the user interprets, send all collected prompts and the rendered Source to the selected model.
5. Replace prompt and model variables, then apply their filters.

Because prompt results arrive after logic, they cannot control an `if` or `for` block in the same initial render. Logic can decide whether a prompt is present, but it cannot branch on that prompt's eventual answer.

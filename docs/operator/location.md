---
permalink: clip/location
description: Understand template Behavior, Note name, Folder, and Vault across each Aria Clip delivery path.
---

# Location

The Location section describes a template's intended destination. It is not a universal browser download setting.

That distinction matters: **Add to Aria** is the canonical browser destination for this model. The CLI already demonstrates the complete Location semantics, while file and clipboard operations intentionally do not route notes into a vault.

## Fields

| Field | Meaning |
| --- | --- |
| **Behavior** | The operation Aria should perform: create, append, prepend, overwrite, or update the daily note. |
| **Note name** | The rendered target name. Variables and filters are supported. |
| **Folder** | The vault-relative folder used to form an Aria note path. It is not an operating-system directory. |
| **Vault** | A configured Aria vault name, or the last/current vault when unset. A name must match Aria exactly when a delivery path uses it. |

## Behaviors

| UI label | Internal value | Intended result |
| --- | --- | --- |
| **Create** | `create` | Create the named note and open it. |
| **Append** | `append-specific` | Add content to the bottom of the named note. |
| **Prepend** | `prepend-specific` | Add content to the top of the named note. |
| **Overwrite** | `overwrite` | Replace the named note through Aria's overwrite operation. |
| **Append daily** | `append-daily` | Add content to the bottom of the current daily note. |
| **Prepend daily** | `prepend-daily` | Add content to the top of the current daily note. |

Daily behaviors hide **Note name** and **Folder** because the current daily note is the target.

## What each delivery path currently applies

| Delivery path | Behavior | Note name | Folder | Vault |
| --- | --- | --- | --- | --- |
| Browser **Save file** | No | Yes, as the sanitized download name | No | No |
| Browser **Copy to clipboard** | No | No | No | No |
| Browser **Add to Aria** | Not in the current native envelope | Sent as the rendering title | Not in the current native envelope | Not in the current native envelope |
| CLI output or `--output` | No | Used to render the capture | Controlled by the CLI output argument | No |
| CLI `--open` | Yes | Yes | Yes | Yes |

### Browser Save file

The extension supplies a sanitized filename, then the browser decides where the file is downloaded. The Folder and Vault fields cannot prefill or redirect the native browser save dialog.

### Browser Add to Aria

The current native message sends the rendered Markdown, source data, extracted variables, template identity, artifact, and rendered properties. It does not yet include the template's Behavior, Folder, or Vault fields. This is a temporary integration gap in the native envelope, not the intended product model.

The next Add to Aria contract should transmit Behavior, rendered Note name, rendered Folder, and Vault together. Aria can then execute the same create, append, prepend, overwrite, and daily-note semantics described by the template. Until that contract lands, do not rely on those fields to route a browser-native capture.

This route also depends on browser packaging. The current Firefox manifest does not request native messaging, so its supported delivery operations are file and clipboard rather than Add to Aria.

### CLI `--open`

This is the current reference implementation of the complete model. The CLI maps the selected behavior to `aria create`, `aria append`, `aria prepend`, `aria daily:append`, or `aria daily:prepend`, with a URI fallback where supported.

For named notes, the target path is formed from Folder plus the sanitized Note name and `.md`. For daily behaviors, Aria resolves the active daily note.

## Examples

With:

```text
Behavior: Append
Note name: {{title}}
Folder: Clips/Papers
Vault: Research
```

CLI `--open` targets a note equivalent to:

```text
Research → Clips/Papers/<sanitized-title>.md
```

The same template used with **Save file** downloads `<sanitized-title>.md` through the browser and does not assert `Research/Clips/Papers` on the filesystem.

This separation keeps the mental model honest: Location is Aria delivery intent; Operations determine which parts of that intent can actually be executed.

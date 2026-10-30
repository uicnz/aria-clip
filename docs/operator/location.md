---
permalink: clip/location
description: Understand Behavior, Note name, Folder, and Vault when Aria receives a capture.
---

# Location

Location is the destination contract a template supplies to Aria. It does not control the browser download directory. A template's `path`, shown as **Folder** in the UI, is always vault-relative. For bare `--save`, the CLI preserves that rendered relative path beneath `${ARIA_HOME}/vault`; `ARIA_HOME` defaults to `~/.aria`.

## Fields

| Field | Meaning |
| --- | --- |
| **Behavior** | Create, append, prepend, overwrite, append daily, or prepend daily. |
| **Note name** | The rendered target name. Template variables and filters are supported. |
| **Folder** | A vault-relative Aria folder, not an operating-system directory. |
| **Vault** | The named Aria vault. An empty value asks Aria to resolve its current/default vault. |

Daily behaviors do not need Note name or Folder because Aria resolves the active daily note.

## Behaviors

| UI | Schema value | Aria intent |
| --- | --- | --- |
| **Create** | `create` | Create the named note. |
| **Append** | `append-specific` | Add to the bottom of the named note. |
| **Prepend** | `prepend-specific` | Add to the top of the named note. |
| **Overwrite** | `overwrite` | Replace the named note. |
| **Append daily** | `append-daily` | Add to the bottom of the current daily note. |
| **Prepend daily** | `prepend-daily` | Add to the top of the current daily note. |

## Operations

| Operation | Uses Location? | Actual destination |
| --- | --- | --- |
| Browser **Save file** | No | The browser download chosen by the user or browser settings. |
| Browser **Copy** | No | The system clipboard. |
| Browser **Add to Aria** | Yes | Aria's registered `nz.uic.aria.deeplink` native host. Not offered in Safari. |
| CLI stdout | No | Standard output. |
| CLI `--save` | Yes | `${ARIA_HOME}/vault/<Folder>/<artifact filename>`. |
| CLI `--save <path>` | No | The exact explicit filesystem path. |
| CLI `--add` | Yes | Aria's DeepLink protocol through `aria --deeplink`. |

The browser and CLI now validate the same versioned capture envelope. It carries the complete Location object together with source data, rendered Markdown, artifact identity, properties, template identity, and extracted values.

Both send it to Aria as a DeepLink `session.start` request. The CLI returns `E_ARIA_UNAVAILABLE` when `aria` is not installed and fails delivery when the installed Aria does not support DeepLink. It never falls back to a URI. The browser route requires Aria's registered native host. Safari cannot reach a native host from its sandbox, so Safari does not offer Add to Aria.

## Example

```text
Behavior: Append
Note name: {{title}}
Folder: Clips/Papers
Vault: Research
```

After rendering, Add to Aria supplies an intent equivalent to:

```text
Research → Clips/Papers/<sanitized-title>.md → append
```

Saving the same capture with bare `--save` writes `${ARIA_HOME}/vault/Clips/Papers/<sanitized-title>.md`, or `~/.aria/vault/Clips/Papers/<sanitized-title>.md` with the default Aria home. Passing `--save <path>` overrides that destination exactly.

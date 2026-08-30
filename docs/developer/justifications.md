# Chrome review answers

These are the source-audited answers for the Chrome manifest at [`src/manifests/chrome.json`](../../src/manifests/chrome.json). Copy them into **Privacy practices** and review them again whenever code or permissions change.

## URLs

- Homepage: <https://aria.bot>
- Support: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>

All three must be publicly reachable during review.

## Single purpose

> Aria Clip captures content from the current web page and converts it into portable Markdown that users can save locally, copy, or deliver to Aria. Templates, highlighting, reader mode, and optional model interpretation support that web-to-Markdown capture workflow.

## Permissions

### `activeTab`

> Used when the user invokes Aria Clip for the current tab. It lets the extension identify and operate on that page for capture, highlighting, embedded display, or reader behavior. It is not used to inspect unrelated tabs.

### `clipboardWrite`

> Used only when the user explicitly chooses a copy action. Aria Clip writes the requested Markdown to the clipboard and never reads clipboard contents.

### `commands`

> Registers keyboard shortcuts for opening Aria Clip, quick capture, the Highlighter, and Reader. A command runs only when the user invokes its shortcut.

### `contextMenus`

> Adds user-invoked page and selection commands for opening Aria Clip, copying Markdown, highlighting text or an element, entering or leaving Reader, and opening embedded or side-panel views.

### `nativeMessaging`

> Sends a structured capture envelope to the registered nz.uic.aria.clip native host only when the user chooses Add to Aria. It communicates with the Aria desktop integration and not with unrelated native applications.

The current envelope contains source and extraction data, rendered Markdown, template identity, artifact, and rendered properties. It does not currently contain the template Behavior, Folder, or Vault fields.

### `sidePanel`

> Provides the optional Chrome side-panel capture interface so a user can inspect inputs, select a template, run an interpretation, and choose an output operation while the source page remains visible. It opens in response to user interaction.

### `storage`

> Stores settings, templates, provider and model configuration, API keys, reader preferences, and extension state in Chrome synchronized extension storage. Highlights and capture history are stored in local extension storage.

### `scripting`

> Injects only scripts and styles packaged with Aria Clip into an eligible current page when capture, highlighting, embedded mode, file delivery in Safari-compatible paths, or Reader requires them. It does not inject downloaded executable code.

### `declarativeNetRequest`

> Creates session-scoped rules limited to YouTube embed and youtubei API requests. The rules set Origin or Referer headers required by YouTube playback and transcript-related requests used by Aria Clip. They do not block, redirect, track, or modify requests on unrelated domains.

### Host permissions

> Aria Clip captures arbitrary HTTP and HTTPS pages chosen by the user rather than a fixed site list. Host access lets its packaged content script extract page content and metadata, restore persistent highlights, support Reader and embedded modes, and make requests to user-configured Interpreter providers. This access directly supports the extension's web-to-Markdown purpose.

## Remote code

Select:

> No, I am not using Remote code

All executable JavaScript, CSS, and fonts are packaged with the extension. The remotely fetched provider catalog, captured website resources, and model responses are processed as data and are not executed as code.

## Data disclosures

Review the dashboard's current definitions and disclose at least the categories the uploaded build handles:

- website content;
- web browsing activity;
- authentication information, because user-entered provider API keys are stored in Chrome synchronized storage and transmitted to the chosen provider;
- user-generated content, including templates, prompts, highlights, and note configuration.

Interpreter sends Source and prompts directly to the provider configured by the user. Add to Aria sends a capture to the local native host only after that operation is invoked. The public privacy policy must describe these flows consistently.

## Broad host access

Chrome may warn that broad host permissions require an in-depth review. They are currently intentional because:

- capture operates on arbitrary user-chosen pages;
- highlights can be restored when those pages load;
- Reader and embedded behavior operate across the web;
- configured Interpreter endpoints are not limited to one vendor.

`activeTab` alone would require a fresh explicit gesture for every access and would not support the current persistent page features. Submit the accurate justification rather than removing a permission that current behavior needs. Conversely, do not retain a permission solely for a future feature; Chrome requires the narrowest permissions needed by the submitted build.

## Submission checklist

1. Verify all public URLs.
2. Enter the single-purpose statement and each dashboard-requested permission answer.
3. Select **No** for remote code.
4. Complete the data categories against the exact uploaded build.
5. Review and personally certify the data-use declarations.
6. Save the draft and submit for review.

## Official references

- [Fill out Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Declare extension permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [User-data policies](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)

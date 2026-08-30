# Chrome Web Store Justifications

This document records the canonical answers for the Chrome Web Store submission of Aria Clip. The permission justifications correspond to [`src/manifests/chrome.json`](../src/manifests/chrome.json).

## Listing URLs

- Homepage: <https://aria.bot>
- Support: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>

Confirm that every URL is publicly reachable before submitting a release.

## Single purpose

> Aria Clip captures content from the current web page and converts it into portable Markdown notes that users can save locally or deliver to Aria. Templates, highlighting, reader mode, and optional AI interpretation support this capture workflow.

## Permission justifications

### `activeTab`

> Used when the user invokes Aria Clip through its toolbar button, context menu, or keyboard shortcut. It provides access to the current page so the extension can extract its content and metadata and activate capture, highlighting, or reader features. It is not used to monitor unrelated tabs.

### `clipboardWrite`

> Used only when the user explicitly chooses Copy Markdown or another copy action. Aria Clip writes the requested Markdown or highlighted content to the clipboard. It never reads clipboard contents.

### `contextMenus`

> Adds user-invoked context-menu commands for saving a page or selection, copying Markdown, highlighting content, opening reader mode, and opening the side panel.

### `nativeMessaging`

> Communicates with the optional Aria desktop companion through the registered nz.uic.aria.clip native host. It sends a capture package only when the user chooses Add to Aria so the note can be stored in the user's Aria vault. It does not execute arbitrary commands or communicate with unrelated native applications.

This permission is deliberately retained because native delivery to Aria is part of the intended product integration.

### `sidePanel`

> Provides the optional Chrome side-panel interface so users can inspect captured page content and metadata, choose templates, run an interpretation, and save the resulting Markdown while keeping the source page visible. The side panel opens only in response to a user action.

### `storage`

> Stores user settings, templates, provider and model configuration, highlights, reader preferences, local clip history, and extension state. Chrome synchronization is used for portable settings, while highlights and clip history are retained locally.

### `scripting`

> Injects only scripts and styles packaged with Aria Clip into the current page when required for capture, highlighting, embedded mode, or reader mode. It does not inject downloaded or remotely hosted executable code.

### `declarativeNetRequest`

> Creates session-scoped rules limited to YouTube embed and YouTube API requests. These rules set the required Origin and Referer headers so YouTube videos and transcripts can be captured and displayed in reader mode. Aria Clip does not block, redirect, track, or modify requests on other domains.

### Host permissions

> Aria Clip must work on any HTTP or HTTPS page the user chooses to capture. Host access is required to extract page content and metadata, restore saved highlights, render reader mode, retrieve resources needed for capture, and communicate with user-configured interpreter providers. Page access directly supports the extension's web-to-Markdown capture purpose.

### `commands`

Chrome did not request a separate justification for this permission during the initial submission. If it does in the future, use:

> Registers optional keyboard shortcuts for opening Aria Clip, capturing the current page, toggling the highlighter, and toggling reader mode. Each command runs only when the user invokes its shortcut.

## Remote code

Select:

> No, I am not using Remote code

All executable JavaScript, CSS, and fonts are bundled with Aria Clip. The remotely fetched provider catalog, webpage resources, and AI responses are handled only as data and are never executed as code.

## Data disclosures

The current extension handles the following Chrome Web Store data categories:

- Website content
- Web browsing activity
- Authentication information, because user-entered interpreter API keys are stored in Chrome synchronized storage
- User-generated content, including templates, prompts, highlights, and note configuration

Interpreter requests are sent directly to the provider configured by the user. Aria does not receive or retain those requests. Capture packages are sent to the local Aria native companion only when the user invokes Add to Aria.

## Broad host permissions

Chrome may warn that broad host permissions can require an in-depth review. The permission is intentional and directly supports Aria Clip's single purpose:

- Aria Clip captures arbitrary webpages rather than a predefined set of sites.
- It restores saved highlights when pages load.
- It provides reader mode across the web.
- It supports user-configured interpreter endpoints.

`activeTab` alone is insufficient because it grants access only after an explicit user gesture and would change or break persistent page features. The broad-host warning does not prevent submission; submit the extension with the host-permission justification above.

## Certification and submission

Before submitting a release:

1. Verify the listing, support, and privacy-policy URLs.
2. Enter the single-purpose statement and every requested permission justification under **Privacy practices**.
3. Select **No, I am not using Remote code**.
4. Disclose the data categories listed above.
5. Review and personally complete the Chrome Web Store data-use certifications.
6. Save the draft and submit it for review.

Chrome's reference documentation:

- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)

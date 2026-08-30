# Publishing Aria Clip for Chrome

This document records the Chrome Web Store submission process for Aria Clip. It covers the initial listing, the answers used during review, and the shorter update process for later releases.

Last verified: 30 August 2026.

## Canonical details

- Product name: **Aria Clip**
- Chrome Web Store item ID: `domljlnekkjgagdpeaafaoojdkkhfgff`
- Homepage: <https://aria.bot>
- Support: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>
- Version source of truth: [`package.json`](../package.json)
- Store manifest: [`src/manifests/chrome.json`](../src/manifests/chrome.json)
- Store artwork: [`assets/chrome`](../assets/chrome)
- Permission and privacy answers: [`docs/justifications.md`](justifications.md)

Confirm that every public URL is reachable before submitting. Chrome checks the homepage, support, and privacy-policy URLs during submission.

## Build the upload

For a complete release on macOS, run:

```sh
bun install --frozen-lockfile
bun run release
```

The Chrome Web Store upload is:

```text
builds/aria-clip-<version>-chrome.zip
```

The ZIP contains the compiled JavaScript extension with `manifest.json` at its root. Do not upload `dist/chrome`, a source archive, the Firefox ZIP, or a Safari artifact.

To build only Chrome while developing:

```sh
bun run typecheck
bun run test
bun run build:chrome
```

For a new release, change the authored version with:

```sh
./scripts/bump-version.sh <version>
```

Do not edit generated manifest or Xcode versions independently. The version in `package.json` is canonical.

## Generate the store artwork

Run:

```sh
bun run build:chrome-assets
```

The Chrome listing uses:

- `assets/chrome/icon128-chrome-store.png` — 128×128 store icon
- `assets/chrome/localized-screenshots-01.png` — 1280×800 localized screenshot
- `assets/chrome/global-screenshots-01.png` — 1280×800 global screenshot
- `assets/chrome/promo-small-440x280.png` — small promotional tile
- `assets/chrome/promo-marquee-1400x560.png` — marquee promotional tile

The promotional video fields are optional and require genuine YouTube URLs. The artwork generator deliberately does not invent them.

## Create the first listing

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in to the existing uic.nz publisher account.
3. Choose **Add new item**.
4. Upload `builds/aria-clip-<version>-chrome.zip`.
5. Complete **Store listing** with the product description, category, language, URLs, icon, screenshots, and promotional artwork.
6. Complete **Privacy practices** using the canonical answers in [`justifications.md`](justifications.md).
7. Complete **Distribution**, including visibility and countries.
8. Add test instructions if reviewers need help reaching a feature.
9. Resolve all required fields and submit the item for review.

Google documents the current dashboard flow in [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/).

## Privacy-practices answers

The full copy-ready wording is preserved in [`justifications.md`](justifications.md). The essential choices made for the first submission were:

- Single purpose: capture the current web page as portable Markdown, with templates, highlights, reader mode, and optional interpretation supporting that workflow.
- Remote code: **No, I am not using Remote code**.
- Broad host permissions: retained because Aria Clip captures arbitrary user-chosen websites and supports page-level highlighting and reader behavior.
- Data-use certification: complete the declarations truthfully and personally certify compliance.

Justifications are recorded for:

- `activeTab`
- `clipboardWrite`
- `contextMenus`
- `nativeMessaging`
- `sidePanel`
- `storage`
- `scripting`
- `declarativeNetRequest`
- host permissions
- `commands`, if Chrome requests it in a future review

Chrome may warn that broad host permissions can cause an in-depth review. That warning does not prevent submission. Do not remove the permissions merely to shorten review when doing so would break the extension's stated behavior.

## Review and publication

Before selecting **Submit for review**:

1. Test the exact ZIP being uploaded in a clean Chrome profile.
2. Confirm capture, templates, interpretation, highlights, reader mode, settings, and saving work.
3. Confirm the listing accurately describes the permissions and data flows in the uploaded version.
4. Confirm all required artwork is opaque PNG at the requested dimensions.
5. Confirm the support and privacy-policy pages are public.
6. Decide whether Chrome should publish automatically after approval or hold the approved submission for manual publication.

Chrome allows deferred publishing, but an approved staged submission must be published within Chrome's stated time limit or it returns to draft.

## Publish an update

1. Bump the version in `package.json`.
2. Run the complete release and test the resulting Chrome ZIP.
3. Open the existing item `domljlnekkjgagdpeaafaoojdkkhfgff`; do not create another listing.
4. Upload the new `aria-clip-<version>-chrome.zip` on the existing item's package page.
5. Update the listing, privacy declarations, test instructions, and release notes when behavior has changed.
6. Submit the update for review.

## Official references

- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)

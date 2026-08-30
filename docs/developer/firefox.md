# Publishing Firefox

Aria Clip uses a listed Mozilla Add-ons submission: Mozilla reviews, signs, hosts, and updates the Firefox package.

Last source audit: 30 August 2026.

## Identity

- Product: **Aria Clip**
- Mozilla account: `dev@uic.nz`
- Distribution: **On this site**
- Add-on ID: `clip@aria.bot`
- Homepage: <https://aria.bot>
- Support email: `dev@uic.nz`
- Support: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>
- Version source: [`package.json`](../../package.json)
- Manifest source: [`src/manifests/firefox.json`](../../src/manifests/firefox.json)
- Reviewer instructions: [`AMO_BUILD.md`](../../AMO_BUILD.md)

## Build both archives

The complete macOS release creates both files Mozilla needs:

```sh
bun install --frozen-lockfile
bun run release
```

```text
builds/aria-clip-<version>-firefox.zip
builds/review/aria-clip-<version>-firefox-source.zip
```

The first file is the compiled extension Mozilla signs. The second is human-readable reviewer source and reproduction material; users do not install it.

To build Firefox on its own:

```sh
bun run typecheck
bun run test
bun run build:firefox
bun run build:firefox-source
```

The source packager excludes Git history, dependencies, generated distributions, existing builds, environment files, signing material, and common macOS debris.

## Answer the source-code question

Answer **Yes**. Aria Clip is authored in TypeScript and bundled and minified with webpack. The installable output is JavaScript, but reviewers need the authored source and deterministic build instructions to reproduce it.

Upload the source ZIP whose version exactly matches the Firefox ZIP. See Mozilla's [source-code submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/).

## Data declaration blocker

The current Firefox source manifest declares:

```json
"data_collection_permissions": {
  "required": ["none"]
}
```

That declaration does **not** match the current Interpreter behavior. When a user interprets, the extension transmits website context and prompts to the configured provider and sends the provider credential in the request. Mozilla defines transmission as data handled outside the add-on or local browser, even when the destination is selected by the user.

Do not submit the next Firefox version with `required: ["none"]` unless Interpreter transmission is removed or disabled in that build. Before submission, implement and test the correct Mozilla consent model. At minimum, review `websiteContent` and `authenticationInfo`; also review `browsingActivity` and any other category that can be present in user-selected source context. If transmission is optional, the code must request optional data permissions before sending it; changing the manifest text alone is not a complete consent implementation.

The current minimum Firefox versions are desktop 142 and Android 142, so the built-in data-consent system is available. Use Mozilla's [current consent guide](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) as the specification.

## First submission

1. Sign in to the [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/) as `dev@uic.nz`.
2. Choose **Submit a New Add-on**.
3. Select **On this site**.
4. Accept the current distribution agreement.
5. Upload the compiled Firefox ZIP.
6. Read every validator result. Errors block progress; warnings require inspection.
7. Select the actually supported platforms.
8. Answer **Yes** to the source-code question and upload the matching source ZIP.
9. Complete listing, privacy, support, license, screenshots, release notes, and reviewer notes.
10. Submit only after the data declaration blocker above is resolved.

## Validator warnings

The original 0.1.0 upload passed with zero errors and 49 general warnings. Most were generated-bundle `innerHTML` warnings plus compatibility warnings from the older minimum version and Chrome-only side-panel code in that historical archive.

That report is evidence for that file only. The current manifest now sets Firefox 142 as the minimum and does not request Chrome's `sidePanel` or `nativeMessaging` permissions. Run validation again for every new ZIP and inspect the authored source behind generated-code warnings.

Because the Firefox manifest does not request `nativeMessaging`, **Add to Aria** is not a supported Firefox review step in the current package. Test file save and clipboard delivery instead.

## Preflight

1. Load the exact Firefox ZIP in a clean profile.
2. Reproduce it from the reviewer source by following `AMO_BUILD.md`.
3. Confirm the add-on ID, version, minimum versions, and data permissions.
4. Test capture, templates, file save, clipboard copy, highlights, reader mode, settings, and Interpreter consent and transmission.
5. Retain the validation report and explain generated warnings if a reviewer asks.
6. Confirm the listing and privacy policy describe the uploaded behavior.

## Update the existing listing

1. Bump the canonical version and build both archives.
2. Open Aria Clip under **My Add-ons**; do not create a second listing.
3. Upload the compiled ZIP as a new version.
4. Upload the identical-version source ZIP.
5. Update release notes, reviewer notes, test instructions, privacy disclosures, and data permissions.
6. Submit and monitor the Developer Hub and `dev@uic.nz`.

## Official references

- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- [Firefox data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

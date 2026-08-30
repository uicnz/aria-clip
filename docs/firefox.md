# Publishing Aria Clip for Firefox

This document records the Mozilla Add-ons submission process for Aria Clip. Aria Clip is distributed as a listed extension on addons.mozilla.org so Mozilla signs, hosts, and updates it for Firefox users.

Last verified: 30 August 2026.

## Canonical details

- Product name: **Aria Clip**
- Mozilla developer account: `dev@uic.nz`
- Distribution choice: **On this site** — listed on Mozilla Add-ons
- Firefox add-on ID: `clip@aria.bot`
- Homepage: <https://aria.bot>
- Support email: `dev@uic.nz`
- Support website: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>
- Version source of truth: [`package.json`](../package.json)
- Store manifest: [`src/manifests/firefox.json`](../src/manifests/firefox.json)
- Reviewer build instructions: [`AMO_BUILD.md`](../AMO_BUILD.md)

Confirm that every public URL is reachable before submitting.

## Build both required archives

For a complete release on macOS, run:

```sh
bun install --frozen-lockfile
bun run release
```

Mozilla receives two different files:

```text
builds/aria-clip-<version>-firefox.zip
builds/review/aria-clip-<version>-firefox-source.zip
```

The first ZIP is the compiled extension users receive after Mozilla signs it. The second ZIP is reviewer-only source code and build documentation. It is not an end-user deliverable.

To build only the Firefox artifacts:

```sh
bun run typecheck
bun run test
bun run build:firefox
bun run build:firefox-source
```

For a new release, change the authored version with:

```sh
./scripts/bump-version.sh <version>
```

The version in `package.json` is canonical. The Firefox manifest receives it during the build.

## Why the source archive is required

The submitted extension is executable JavaScript, but Aria Clip is authored primarily in TypeScript and bundled with webpack. Mozilla therefore asks whether the extension uses a minifier, bundler, template engine, code generator, or another build-time processor.

Answer:

> Yes, this extension requires a source code submission.

Upload `builds/review/aria-clip-<version>-firefox-source.zip` when prompted. It contains the human-readable source and exact reproduction instructions. The packaging script excludes Git history, dependencies, generated distributions, existing builds, personal environment files, signing keys, and common macOS debris.

Mozilla requires matching source for every submitted version when generated or bundled code is present. See [Source code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/).

## Create the first listing

1. Sign in to the [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/) as `dev@uic.nz`.
2. Choose **Submit a New Add-on**.
3. Select **On this site** so Mozilla lists and distributes the extension.
4. Accept the current Firefox Add-on Distribution Agreement.
5. Upload `builds/aria-clip-<version>-firefox.zip`.
6. Review the automated validation results. Errors must be fixed before continuing; warnings require review but do not necessarily block submission.
7. Select the supported Firefox platforms requested by the submission form.
8. When asked whether source code is required, answer **Yes** and upload the matching reviewer-source ZIP.
9. Complete the listing name, URL slug, summary, description, categories, support details, license, privacy policy, screenshots, and reviewer notes.
10. Submit the version.

Mozilla's current workflow is documented in [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).

## Validator warnings seen during the first submission

The first Aria Clip package passed Mozilla validation with zero errors. The warnings were principally:

- Compatibility warnings caused by manifest keys newer than the originally declared minimum Firefox version.
- Firefox's lack of support for Chrome's `sidePanel.open` API in generated cross-browser code.
- Repeated `innerHTML` warnings inside generated bundles.

The minimum Firefox version is now declared in the Firefox manifest. Generated-code warnings should still be reviewed against the authored source and explained to a reviewer if requested. A warning is not permission to ignore a genuine security issue, but it is also not automatically a submission failure.

## Listing and review information

Record the following accurately:

- The add-on captures user-selected web content and converts it to Markdown.
- Interpreter requests occur only when the user configures a provider and invokes interpretation.
- A privacy policy is required whenever data is transmitted from the device, including to a user-selected third-party provider.
- Provide test steps for capture, templates, interpretation, highlights, reader mode, settings, and saving.
- If a feature requires an external account, supply safe reviewer credentials or explain how to test without them.
- Include source-build details or unusual implementation notes in **Notes for Reviewers**.

The manifest currently declares Mozilla's required data-collection value as `none`. Revisit that declaration before every release and change it if the extension's actual behavior or Mozilla's classification rules change.

## Review and publication

Mozilla signs all public Firefox extensions. Because Aria Clip uses the listed-AMO route, Mozilla hosts the signed package and Firefox delivers updates automatically.

Before submitting:

1. Test the exact Firefox ZIP in a clean Firefox profile.
2. Reproduce the build from the reviewer-source ZIP using `AMO_BUILD.md`.
3. Confirm the generated version and add-on ID are correct.
4. Confirm the listing, privacy policy, and reviewer notes describe the uploaded behavior.
5. Inspect every validator warning and retain the validation report with the release record.

## Publish an update

1. Bump the version in `package.json`.
2. Build and test both Firefox archives.
3. Open the existing Aria Clip listing under **My Add-ons**; do not create another listing.
4. Upload the new compiled Firefox ZIP as a new version.
5. Answer **Yes** to the source-code question and attach the source ZIP with the identical version.
6. Update release notes, reviewer notes, listing text, privacy disclosures, and test instructions as needed.
7. Submit the version and monitor email and the Developer Hub for review requests.

## Official references

- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Source code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Firefox Add-on Distribution Agreement](https://extensionworkshop.com/documentation/publish/firefox-add-on-distribution-agreement/)

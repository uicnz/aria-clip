# Publishing Chrome

This is the canonical Chrome Web Store runbook for Aria Clip.

Last source audit: 30 August 2026.

## Identity

- Product: **Aria Clip**
- Existing item ID: `domljlnekkjgagdpeaafaoojdkkhfgff`
- Homepage: <https://aria.bot>
- Support: <https://docs.aria.bot>
- Privacy policy: <https://aria.bot/privacy>
- Version source: [`package.json`](../../package.json)
- Manifest source: [`src/manifests/chrome.json`](../../src/manifests/chrome.json)
- Artwork: [`assets/chrome`](../../assets/chrome)
- Review answers: [`justifications.md`](justifications.md)

Check every public URL immediately before submission. The dashboard can reject unreachable homepage, support, or privacy-policy URLs.

## Build the package

The complete macOS release produces the Chrome, Firefox, Firefox review-source, and notarized Safari artifacts:

```sh
bun install --frozen-lockfile
bun run release
```

Upload only:

```text
builds/aria-clip-<version>-chrome.zip
```

It is a compiled Manifest V3 extension with `manifest.json` at the ZIP root. Do not upload `dist/chrome`, the Firefox source archive, or any Safari artifact.

For a Chrome-only verification build:

```sh
bun run typecheck
bun run test
bun run build:chrome
```

Set a release version with:

```sh
./scripts/bump-version.sh X.Y.Z
```

`package.json` is canonical. Webpack injects that version into the generated manifest; generated files are not independent version sources.

## Generate artwork

```sh
bun run build:chrome-assets
```

The generator writes:

| File | Use |
| --- | --- |
| `assets/chrome/icon128-chrome-store.png` | 128×128 store icon |
| `assets/chrome/localized-screenshots-01.png` | 1280×800 localized screenshot |
| `assets/chrome/global-screenshots-01.png` | 1280×800 global screenshot |
| `assets/chrome/promo-small-440x280.png` | 440×280 promo tile |
| `assets/chrome/promo-marquee-1400x560.png` | 1400×560 marquee |

The video fields are optional and require real YouTube URLs; the generator does not invent them.

## First submission

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in to the uic.nz publisher account.
3. Choose **Add new item** and upload the Chrome ZIP.
4. Complete **Store listing** with copy, category, language, URLs, icon, screenshots, and promo artwork.
5. Complete **Privacy practices** with [`justifications.md`](justifications.md).
6. Complete **Distribution**.
7. Add reviewer instructions for the features present in the uploaded build.
8. Resolve every required field, save, and submit for review.

The current dashboard flow is documented by [Chrome for Developers](https://developer.chrome.com/docs/webstore/publish/).

## Review choices

- Remote code: **No, I am not using Remote code**.
- Broad host access: retain and justify it because capture, persistent highlights, and reader mode work on arbitrary user-chosen pages.
- Single purpose: web-to-Markdown capture; templates, highlights, reader mode, and optional interpretation support that purpose.
- Data disclosures: must match the uploaded code and the public privacy policy.
- Certification: a publisher must personally certify compliance in the dashboard.

Chrome may route broad-host extensions to deeper review. That warning does not block submission. It also does not excuse an unused permission: compare the generated manifest with current behavior before every release.

## Preflight

1. Load the exact ZIP in a clean Chrome profile.
2. Confirm its generated manifest version equals `package.json`.
3. Test capture, templates and triggers, file save, clipboard copy, highlights, reader mode, settings, and Interpreter.
4. Test **Add to Aria** only on a machine with the registered native host.
5. Confirm each permission and data flow is reflected in the listing and privacy policy.
6. Confirm the artwork is opaque JPEG or 24-bit PNG at the required dimensions.
7. Decide whether approval should publish automatically or wait for manual publication.

## Update the existing item

1. Bump `package.json` through the version script.
2. Run and test the complete release.
3. Open item `domljlnekkjgagdpeaafaoojdkkhfgff`; do not create another listing.
4. Upload `aria-clip-<version>-chrome.zip` as the new package.
5. Update release notes, reviewer steps, store copy, and privacy answers wherever behavior changed.
6. Submit the update and monitor the dashboard and publisher email.

## Official references

- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [User-data policies](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)

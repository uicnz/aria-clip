# Aria Clip

> This tool is for internal use, We've made URLs public for our convenience.

## Get started

Install the headless CLI with Bun or npm:

```sh
bun add --global aria-clip
# or: npm install --global aria-clip

clip https://example.com/article
clip video https://www.youtube.com/watch?v=zMvBMfj4cSQ
```

`clip` and `aria-clip` are equal names for the same executable. A clean CLI
installation can extract, template, interpret, and deliver captures without a
browser extension. Run `clip setup` later to add the optional browser-native
workflow when verified public extension listings are available.

## Roadmap

In no particular order:

- [ ] Annotate highlights
- [ ] Template directory
- [ ] Sync settings across browsers
- [x] A separate icon for Clip
- [x] Template validation
- [x] Template logic (if/for)
- [x] Save images locally
- [x] Translate UI into more languages

## Command line

Build a publishable package and install it locally:

```sh
bun run package:cli
bun add --global ./builds/npm/aria-clip-<version>.tgz
clip https://example.com/article
```

The bare URL command prints deterministic Markdown without contacting a model
or writing a file. See the [operator guide](docs/operator/cli.md) and
[CLI architecture](docs/developer/cli.md).

## Developers

To build the extension:

```sh
bun run build
```

This will create one distribution directory with a subdirectory for each browser:

- `dist/chrome/` for the Chromium version
- `dist/firefox/` for the Firefox version
- `dist/safari/` for the Safari version

### Build release artifacts

On macOS, one command builds the Chrome Web Store and Mozilla Add-ons packages, then builds, signs, and notarizes the Safari disk image with the same uic.nz team and `aria-notarytool` Keychain profile used by Aria:

```sh
bun run release
```

The command runs type checking and tests before producing four release artifacts:

- `aria-clip-<version>-chrome.zip`
- `aria-clip-<version>-firefox.zip`
- `aria-clip-<version>-safari.dmg`
- `npm/aria-clip-<version>.tgz`

Upload the Firefox ZIP to Mozilla Add-ons as a listed extension owned by the `dev@uic.nz` account. Mozilla reviews, signs, hosts, and updates the extension for users. The Safari web ZIP is an intermediate file and is removed after a successful release.

Because the Firefox JavaScript is generated from TypeScript with webpack, Mozilla also requires the matching reviewer source package. The release command creates it separately at `builds/review/aria-clip-<version>-firefox-source.zip`; it is not an end-user distributable. The same release also clean-installs and exercises the npm tarball with Bun and Node 24.

Use `bun run release -- --skip-notarize` only for local Safari testing, or `bun run release -- --dry-run` to inspect the complete command sequence. Signing uses Aria's team `N68C9LUA5B` and `aria-notarytool` profile. The same `ARIA_NOTARY_KEYCHAIN` and `ARIA_NOTARY_BOOTSTRAP_*` variables used by Aria can recover a missing profile.

Release tooling reads those overrides and provider credentials from the canonical `~/.aria/.env` file. It does not search for a repository-level `.env` file.

### Install the extension locally

For Chromium browsers, such as Chrome, Brave, Edge, and Arc:

1. Open your browser and navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/chrome` directory

For Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to the `dist/firefox` directory and select the `manifest.json` file

The development build is temporary. A normal permanent installation must come
from Mozilla Add-ons or a Mozilla-signed XPI. Do not disable Firefox signature
enforcement as an ordinary installation workflow.

For iOS Simulator testing on macOS:

1. Run `bun run build` to build the extension
2. Open `xcode/Aria Clip/Aria Clip.xcodeproj` in Xcode
3. Select the **Aria Clip (iOS)** scheme from the scheme selector
4. Choose an iOS Simulator device and click **Run** to build and launch the app
5. Once the app is running on the simulator, open **Safari**
6. Navigate to a webpage and tap the **Extensions** button in Safari to access the Clip extension

### Run tests

```sh
bun run test
```

Or run in watch mode during development:

```sh
bun run test:watch
```

# Aria Clip

## Get started

Install the extension from source while its public store listings are prepared.

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

The command runs type checking and tests before producing exactly three release artifacts in `builds/`:

- `aria-clip-<version>-chrome.zip`
- `aria-clip-<version>-firefox.zip`
- `aria-clip-<version>-safari.dmg`

Upload the Firefox ZIP to Mozilla Add-ons as a listed extension owned by the `silo@uic.nz` account. Mozilla reviews, signs, hosts, and updates the extension for users. The Safari web ZIP is an intermediate file and is removed after a successful release.

Because the Firefox JavaScript is generated from TypeScript with webpack, Mozilla also requires the matching reviewer source package. The release command creates it separately at `builds/review/aria-clip-<version>-firefox-source.zip`; it is not an end-user distributable.

Use `bun run release -- --skip-notarize` only for local Safari testing, or `bun run release -- --dry-run` to inspect the complete command sequence. The Apple team defaults to `N68C9LUA5B`; override release configuration only when necessary with `ARIA_CLIP_APPLE_TEAM_ID`, `ARIA_CLIP_SIGN_IDENTITY`, `ARIA_CLIP_NOTARY_PROFILE`, or `ARIA_NOTARY_KEYCHAIN`.

### Install the extension locally

For Chromium browsers, such as Chrome, Brave, Edge, and Arc:

1. Open your browser and navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/chrome` directory

For Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to the `dist/firefox` directory and select the `manifest.json` file

If you want to run the extension permanently you can do so with the Nightly or Developer versions of Firefox.

1. Type `about:config` in the URL bar
2. In the Search box type `xpinstall.signatures.required`
3. Double-click the preference, or right-click and select "Toggle", to set it to `false`.
4. Go to `about:addons` > gear icon > **Install Add-on From File…**

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

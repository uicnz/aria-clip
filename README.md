# Aria Clip

## Get started

Install the extension from the source. This won't be distributed publicly.

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

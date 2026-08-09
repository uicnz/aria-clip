# Aria Clip

## Get started

Install the extension from the source. This won't be distributed publicly.

## Contribute

### Translations

You can help translate Web Clipper into your language. Submit your translation via pull request using the format found in the [/_locales](/src/_locales) folder.

## Roadmap

In no particular order:

- [ ] Annotate highlights
- [ ] Template directory
- [ ] Sync settings across browsers
- [x] A separate icon for Web Clipper (1.6.3)
- [x] Template validation (1.1.0)
- [x] Template logic (if/for)  (1.1.0)
- [x] Save images locally ([Obsidian 1.8.0](https://obsidian.md/changelog/2024-12-18-desktop-v1.8.0/))
- [x] Translate UI into more languages — help is welcomed

## Developers

To build the extension:

```sh
bun run build
```

This will create three directories:

- `dist/` for the Chromium version
- `dist_firefox/` for the Firefox version
- `dist_safari/` for the Safari version

### Install the extension locally

For Chromium browsers, such as Chrome, Brave, Edge, and Arc:

1. Open your browser and navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist` directory

For Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to the `dist_firefox` directory and select the `manifest.json` file

If you want to run the extension permanently you can do so with the Nightly or Developer versions of Firefox.

1. Type `about:config` in the URL bar
2. In the Search box type `xpinstall.signatures.required`
3. Double-click the preference, or right-click and select "Toggle", to set it to `false`.
4. Go to `about:addons` > gear icon > **Install Add-on From File…**

For iOS Simulator testing on macOS:

1. Run `bun run build` to build the extension
2. Open `xcode/Obsidian Web Clipper/Obsidian Web Clipper.xcodeproj` in Xcode
3. Select the **Obsidian Web Clipper (iOS)** scheme from the scheme selector
4. Choose an iOS Simulator device and click **Run** to build and launch the app
5. Once the app is running on the simulator, open **Safari**
6. Navigate to a webpage and tap the **Extensions** button in Safari to access the Web Clipper extension

### Run tests

```sh
bun run test
```

Or run in watch mode during development:

```sh
bun run test:watch
```

## Third-party libraries

- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) for browser compatibility
- [defuddle](https://github.com/kepano/defuddle) for content extraction and Markdown conversion
- [dayjs](https://github.com/iamkun/dayjs) for date parsing and formatting
- [lz-string](https://github.com/pieroxy/lz-string) to compress templates to reduce storage space
- [lucide](https://github.com/lucide-icons/lucide) for icons
- [dompurify](https://github.com/cure53/DOMPurify) for sanitizing HTML

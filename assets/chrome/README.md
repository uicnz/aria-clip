# Chrome Web Store assets

Generate the Chrome Web Store artwork from the repository root:

```sh
bun run build:chrome-assets
```

The script preserves `icon128-chrome-store.png` exactly as supplied and generates:

- `localized-screenshots-01.png` — the supplied UI screenshot, cropped from the left and normalized to 1280×800
- `global-screenshots-01.png` — a global copy of the normalized UI screenshot
- `promo-small-440x280.png` — required small promo tile
- `promo-marquee-1400x560.png` — optional marquee promo tile

Generated promotional artwork uses the unchanged `assets/icon.svg` logo on black, Roboto 900 in white for “Aria Clip,” and Roboto 300 in gray for “Capture the web as Markdown.” Every generated file is an opaque 24-bit PNG without alpha. ImageMagick and librsvg must be available as `magick` and `rsvg-convert` on `PATH`.

Promo-video fields require real YouTube URLs and are intentionally not generated.

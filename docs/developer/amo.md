# Firefox reviewer build

Aria Clip is authored primarily in TypeScript. Webpack uses `esbuild-loader` to transpile that source and bundle the resulting JavaScript. The submitted Firefox extension contains no TypeScript and is produced entirely from the source in this archive using open-source tools and public package registries.

## Environment

- Operating system: macOS or Linux
- Bun: the exact version declared by `packageManager` in `package.json`
- Network access to the public npm registry for dependency installation

Install Bun from its official distribution if it is not already available:

```sh
BUN_VERSION="$(sed -n 's/.*"packageManager": "bun@\([^"]*\)".*/\1/p' package.json)"
curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
```

## Reproduce the submitted extension

Run these commands from the directory containing `package.json`:

```sh
bun install --frozen-lockfile
bun run build:firefox
```

The unpacked extension is written to `dist/firefox/`. The Firefox submission archive is written to `builds/aria-clip-<version>-firefox.zip` with `manifest.json` at its root, where `<version>` is the version in `package.json`.

No proprietary build tools, private packages, or web-based code generators are required.

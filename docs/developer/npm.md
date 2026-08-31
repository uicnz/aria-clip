# npm

The public npm package is the headless Aria Clip distribution. It exposes two
equal binaries backed by one generated bundle:

```sh
aria-clip <command>
clip <command>
```

`package.json` is the sole package name and version source. The release package
contains generated JavaScript only; repository source remains TypeScript.

## Build and inspect

```sh
bun run test:package
npm install --global ./builds/npm/aria-clip-<version>.tgz
clip --version
clip video <url>
```

`test:package` builds the CLI and API, installs the tarball into a clean
temporary project, and exercises both binary names with Bun plus the bundle
with Node 24. It also tests template-relative file delivery and browser setup's
non-mutating JSON protocol.

Inspect the exact registry payload before publication:

```sh
npm publish ./builds/npm/aria-clip-<version>.tgz --dry-run
```

## Publish

The release account must own `aria-clip` on npm and be authenticated with npm's
required second factor or configured as a trusted publisher. This repository
does not contain npm credentials.

```sh
npm login
bun run publish:npm
```

The script reruns the complete package smoke gate and publishes only the
generated tarball with public access. Pass npm publication flags after `--`:

```sh
bun run publish:npm -- --dry-run
bun run publish:npm -- --otp <code>
```

After publication, verify the registry and a genuinely clean installation:

```sh
npm view aria-clip name version bin engines dist.integrity
npm install --global aria-clip
clip --version
clip setup --dry-run --json
```

The current package name is unclaimed as of the RFC's acceptance. Public
publication remains an external release action and must not be inferred from a
successful local pack.

## Browser setup

`clip setup` detects Chrome, Firefox, and Safari and uses the verified routes in
`browsers.json`. It does not install unsigned builds or mutate browser profiles.
Until a store or signed containing-app route is actually public, that browser
is reported as `unpublished`.

```sh
clip setup --dry-run --json
clip setup
clip setup --browser firefox
```

Opening a route means `confirmation-required`; it is not reported as an
installed extension. Browser installation must be confirmed in the vendor UI.

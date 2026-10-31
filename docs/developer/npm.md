# npm

The public npm package is the headless Aria Clip distribution. It exposes two
equal binaries backed by one generated bundle:

```sh
aria-clip <command>
clip <command>
```

`package.json` is the sole package name and version source. The release package
contains generated JavaScript only; repository source remains TypeScript. Its
`publishConfig` pins public access on `https://registry.npmjs.org/`.

## Build and inspect

```sh
bun run test:package
npm install --global ./builds/npm/uicnz-aria-clip-<version>.tgz
clip --version
clip video <url>
```

`test:package` builds the CLI and API, installs the tarball into a clean
temporary project, and exercises both binary names with Bun plus the bundle
with Node 24. It also tests template-relative file delivery and browser setup's
non-mutating JSON protocol.

Inspect the exact registry payload before publication:

```sh
npm publish ./builds/npm/uicnz-aria-clip-<version>.tgz --dry-run
```

## Publish

The package is owned explicitly by the npm organization scope
`@uicnz/aria-clip`. The authenticated release user must be a member of the
`uicnz` npm organization with permission to publish and must satisfy npm's
required second factor or trusted-publisher policy. This repository does not
contain npm credentials.

```sh
npm login
bun run publish:npm
```

The script verifies `npm whoami` and the user's `uicnz` organization
membership, reruns the complete package smoke gate, and publishes only the
generated tarball with public access. Pass npm publication flags after `--`:

```sh
bun run publish:npm -- --dry-run
bun run publish:npm -- --otp <code>
```

After publication, verify the registry and a genuinely clean installation:

```sh
npm view @uicnz/aria-clip name version bin engines dist.integrity
npm install --global @uicnz/aria-clip
clip --version
clip setup --dry-run --json
```

Public publication remains an external release action and must not be inferred
from a successful local pack.

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

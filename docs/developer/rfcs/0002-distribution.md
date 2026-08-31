# RFC 0002: CLI distribution and browser setup

- Status: Implemented
- Date: 2026-08-31
- Owners: Aria Clip

## Decision

Aria Clip ships one headless product through npm and offers one optional setup
workflow for its browser projections.

```sh
bun add --global aria-clip
clip video <url>
clip setup
```

`aria-clip` remains the canonical executable. `clip` is an equal npm binary
alias backed by the same bundle, command registry, schemas, and behavior.

## Product contract

A clean npm installation is a complete headless installation. Without running
setup, a user can:

- extract complete readable source with the shared Defuddle pipeline;
- select or explicitly invoke built-in and user templates;
- interpret with the shared provider catalog and credentials loaded from
  `~/.aria/.env`;
- print Markdown, save at the template's relative path beneath
  `~/.aria/vault`, or use another available shared delivery projection.

AI clipping requires a configured model and its provider credential. Browser
extensions are not required for headless clipping. They add browser-native
capture, selection, highlighting, and side-panel workflows.

## One setup workflow

`clip setup` is the only public browser-setup command. It detects supported
browsers and opens the appropriate official installation surface for each one.
`--browser` may narrow the targets, but it does not expose browser-specific
installation commands or semantics.

The initial supported browser families are Chrome, Firefox, and Safari. Their
adapters may use different vendor mechanisms internally:

- Chrome opens the Chrome Web Store listing.
- Firefox opens the Mozilla-signed distribution listing or signed XPI.
- Safari opens the signed and notarized containing-app distribution.

Those differences are implementation details. The public sequence remains:

1. run `clip setup`;
2. complete the browser or operating-system confirmation shown;
3. enable the extension if the browser asks.

The command does not use enterprise policy, disable signature enforcement,
modify browser profiles, sideload an unsigned extension, or bypass a vendor's
consent UI.

## Truthful status

Launching a store page, signed package, or containing app is not proof that an
extension was installed or enabled. Setup therefore reports only these states:

- `not-detected`: the browser was not found;
- `unpublished`: no verified public distribution route is configured;
- `ready`: a verified route is available and a dry run made no change;
- `confirmation-required`: the verified route was opened and the user must
  finish the vendor confirmation.

The protocol never reports `installed` without a browser-owned verification
signal. An unpublished Firefox or Safari route remains visibly unavailable;
the implementation must not guess a store URL or substitute a development
installation.

## Canonical distribution data

`browsers.json` is the checked-in registry for browser identities, supported
platforms, detection hints, and verified distribution routes. Its shape is
owned by `src/schemas/browser.ts` and parsed with Zod before use.

The registry does not repeat the application version. `package.json` remains
the sole version source for the npm package, extension manifests, Safari
metadata, and generated artifacts.

Adding or publishing a browser distribution is a data change plus verification
of the real destination. It must not require a new public command.

## Agent protocol

`clip setup --dry-run --json` performs detection without opening external
applications. JSON stdout is versioned and contains one result per selected
browser. Human diagnostics remain on stderr only when a command fails.

Setup results disclose the route, whether an external surface was launched,
whether confirmation remains, and the next action. A zero process exit means
the setup operation itself was evaluated or launched successfully; it does not
mean every extension is installed.

## npm package

The npm package contains the generated CLI bundle, programmatic API bundle,
package metadata, and runtime dependencies needed for clean installation. Both
binary names resolve to the same generated JavaScript:

```json
{
  "bin": {
    "aria-clip": "./cli.cjs",
    "clip": "./cli.cjs"
  }
}
```

Bun is the primary runtime. The bundle also supports Node 24 or later. Source
remains TypeScript; JavaScript exists only in generated package output.

Publication uses the tarball produced from the version in `package.json` and
must pass the package smoke suite before `npm publish`. npm authentication and
ownership are external release prerequisites, not repository configuration.

## Verification

Before publication:

1. run the standard type, unit, extension build, and package gates;
2. install the generated tarball into a clean temporary project;
3. execute both `aria-clip` and `clip` with Bun and Node 24;
4. prove `clip video <url>` resolves to the shared Video Notes transform;
5. exercise `clip setup --dry-run --json` and validate its protocol;
6. practically clip a real accessible URL and inspect the artifact breadth and
   exact template-relative delivery path.

Store publication and browser confirmation remain separate practical checks.
No package test may be described as proof that a store has installed an
extension.

## Implementation record

Version 0.3.0 implements the contract with:

- `aria-clip` and `clip` npm binaries mapped to one generated bundle;
- the Zod-owned `browsers.json` registry and versioned setup result;
- `clip setup`, `--browser`, `--dry-run`, and `--json`;
- shared CLI discovery, help, schemas, capabilities, completions, and errors;
- clean-package smoke coverage with Bun and Node 24;
- a gated `publish:npm` command that publishes only the staged tarball.

At implementation time, Chrome, Firefox, and Safari are deliberately recorded
as `unpublished`: none has a verified public installation destination yet.
Publishing a route changes registry data, not the public setup workflow.

## Rejected alternatives

- Browser-specific public commands were rejected because they create snowflake
  workflows and expose vendor mechanics as product semantics.
- Automatic profile mutation and enterprise-policy installation were rejected
  because they are privileged, brittle, and inappropriate for ordinary users.
- Bundling unsigned development extensions was rejected because it cannot
  provide the same durable installation contract across browsers.
- Making browser setup mandatory was rejected because the npm CLI is already a
  complete headless projection of the application.

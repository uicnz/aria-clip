# Scripts

## Localization

Aria Clip reads its one file-backed environment from `~/.aria/.env`. Add the OpenAI API key there:

```ini
OPENAI_API_KEY=sk-...
```

Repository-level and working-directory `.env` files are not searched. An explicitly injected process variable may override the file for CI.

Scripts can be run using Bun in the root of the repo.

### Update locale

```sh
bun run update-locales
```

- Checks the English locale file and automatically translates missing strings
- Reorganizes strings alphabetically

### Add locale

```bash
bun run add-locale fr
```

## Version bump

```sh
./scripts/bump-version.sh 1.0.1
```

- Updates the single authored version in `package.json`
- Regenerates Xcode's inherited version setting
- Browser manifests receive the package version automatically during builds

## Changelog

```sh
./scripts/generate-changelog.sh
```

- Generates `changelogs/<version>.md` from commits since the last git tag
- Reads the version from `package.json`
- Commits starting with "fix" are grouped under an **Improved** section
- Version bump commits are excluded

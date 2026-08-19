#!/bin/bash

set -e

NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
	echo "Usage: ./bump-version.sh <version>"
	echo "Example: ./bump-version.sh 1.0.1"
	exit 1
fi

if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "Error: Version must be in semver format (X.Y.Z)"
	exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $NEW_VERSION"
echo ""

cd "$ROOT_DIR"
NEW_VERSION="$NEW_VERSION" bun -e '
	const packagePath = "package.json";
	const packageJson = await Bun.file(packagePath).json();
	packageJson.version = process.env.NEW_VERSION;
	await Bun.write(packagePath, `${JSON.stringify(packageJson, null, "\t")}\n`);
'
bun run sync:version

echo ""
echo "Updated package.json to $NEW_VERSION. Browser and Apple metadata will derive from it."

# Publishing Safari

Safari Web Extensions are distributed inside containing apps. Apple now supports both Xcode archives and an App Store Connect web packager; this repository also produces a signed and notarized macOS DMG for direct distribution.

Last source audit: 30 August 2026.

## Identity

- Product: **Aria Clip**
- Apple team: uic.nz
- Team ID: `N68C9LUA5B`
- App bundle ID: `nz.uic.aria.clip`
- Extension bundle ID: `nz.uic.aria.clip.extension`
- Xcode project: [`xcode/Aria Clip/Aria Clip.xcodeproj`](<../../xcode/Aria Clip/Aria Clip.xcodeproj>)
- macOS scheme: `Aria Clip (macOS)`
- iOS scheme: `Aria Clip (iOS)`
- Version source: [`package.json`](../../package.json)
- Support: <https://docs.aria.bot>
- Marketing: <https://aria.bot>
- Privacy policy: <https://aria.bot/privacy>

The project contains macOS and iOS containing apps and matching Safari extension targets.

## Artifact map

| Artifact | Purpose | Destination |
| --- | --- | --- |
| `builds/aria-clip-<version>-safari.zip` | Generated Safari web-extension resources with a root manifest | Temporary Safari install or App Store Connect Web Extension Packager |
| Xcode macOS archive | Existing containing app and custom Swift extension handler | TestFlight or Mac App Store through App Store Connect |
| Xcode iOS archive | Existing iOS containing app and custom Swift extension handler | TestFlight or iOS App Store through App Store Connect |
| `builds/aria-clip-<version>-safari.dmg` | Developer ID-signed and notarized macOS app | GitHub or direct website distribution |

`bun run build:safari` creates the resource ZIP. A successful `bun run release` uses those resources to build the notarized DMG and then removes the intermediate Safari ZIP.

## Choose a route

### Existing Xcode project — canonical App Store route

Use this route for the current repository. Its Safari extension target contains a custom Swift handler used as a native fetch proxy for YouTube requests. An automatically generated containing app from Apple's web packager does not automatically inherit that source code.

### App Store Connect Web Extension Packager — valid resource-only route

Apple now accepts a ZIP containing the full web extension through **Xcode Cloud → Safari Web Extension Packager** in App Store Connect and builds macOS and iOS containing apps. The Safari ZIP in this repository has the expected root manifest and resources.

Do not treat that package as behaviorally equivalent until the packaged build has been tested against every feature that depends on the custom Swift handler. For the current application, the existing Xcode project is the safer App Store route.

### Direct notarized DMG — macOS outside the App Store

The DMG supports signed direct distribution on macOS. It does not distribute to iPhone or iPad and is not uploaded as an App Store build.

The App Store and direct routes can coexist.

## Prepare a version

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build:safari
```

The Safari build synchronizes `package.json` into `xcode/Aria Clip/Version.xcconfig`. `MARKETING_VERSION` reads that generated value.

Xcode's `CURRENT_PROJECT_VERSION` is the independent App Store build number. Increment it for every upload; it is currently set in the project file and is not derived from `package.json`.

Before archiving:

1. Use a stable Xcode release accepted by App Store Connect.
2. Accept current Apple Developer Program agreements.
3. Confirm signing for team `N68C9LUA5B` and both bundle identifiers.
4. Confirm all public listing URLs are reachable.
5. Test the Safari resource build and both containing-app targets.

## Create the App Store Connect record

1. Open [App Store Connect](https://appstoreconnect.apple.com/).
2. Under **Apps**, choose **New App**.
3. Select macOS and iOS if both platforms will ship under the same record.
4. Use the existing app bundle ID `nz.uic.aria.clip` and an internal SKU such as `aria-clip`.
5. Set the product name, primary language, and uic.nz team access.
6. Resolve identifier, tax, agreement, or role issues before uploading a build.

## Archive the existing macOS app

1. Open the Xcode project.
2. Select `Aria Clip (macOS)` and a generic macOS archive destination.
3. Choose **Product → Archive**.
4. In Organizer, validate the archive.
5. Resolve signing, entitlement, bundle, privacy, and packaging errors.
6. Choose the current **App Store Connect** distribution option and upload.
7. Wait for App Store Connect processing.

## Archive the existing iOS app

1. Select `Aria Clip (iOS)` and the generic iOS device destination.
2. Choose **Product → Archive**.
3. Validate the archive in Organizer.
4. Resolve every validation error.
5. Upload through the current App Store Connect distribution option.
6. Wait for processing.

Each platform needs its own archive and platform listing material even when the apps share one product record.

## Use Apple's web packager

If intentionally testing the resource-only route:

1. Run `bun run build:safari` and retain `builds/aria-clip-<version>-safari.zip`.
2. Create or open the App Store Connect app record.
3. Open **Xcode Cloud → Safari Web Extension Packager**.
4. Upload the Safari ZIP containing the root `manifest.json` and all resources.
5. Wait for packaging and inspect every compatibility exception.
6. Distribute the result through TestFlight before review.
7. Verify YouTube capture/reader behavior and any native-message path against the Xcode build before choosing this route for production.

Apple states that the packager can create macOS and iOS apps without a Mac or Xcode. Its Xcode Cloud compute counts against the team's included allowance.

## Listing and review

Complete the following for each platform:

- description, subtitle, keywords, category, age rating, and copyright;
- support, marketing, and privacy-policy URLs;
- App Privacy questionnaire;
- availability and pricing;
- required Mac, iPhone, and iPad screenshots;
- review contact, notes, and any credentials;
- manual, automatic, or phased release choice where offered.

Review notes should explain that the containing app installs Aria Clip's Safari Web Extension and give exact enablement steps. Test through TestFlight on clean real devices where possible.

## Build direct macOS distribution

```sh
bun run release
```

On macOS the release script:

1. runs type checking and tests;
2. builds Chrome, Firefox, Safari, and Firefox review source;
3. archives and exports `Aria Clip (macOS)` with a Developer ID Application identity;
4. creates and signs `builds/aria-clip-<version>-safari.dmg`;
5. submits it with the `aria-notarytool` Keychain profile;
6. staples and validates the notarization ticket;
7. verifies the signature, DMG, and embedded extension resources.

The team, identity, notary profile, and optional keychain can be overridden with the environment variables printed by `bun run release -- --help`.

`--skip-notarize` exists for deliberate packaging tests. Do not publish that output as the official direct download.

## Update

1. Bump `package.json` through the version script.
2. Increment `CURRENT_PROJECT_VERSION` to a never-uploaded build number.
3. Build and test Safari.
4. Archive and validate each platform through the chosen App Store route.
5. Update release notes, screenshots, privacy answers, review notes, and listing copy where behavior changed.
6. Test processed builds in TestFlight.
7. Submit the existing App Store records for review.
8. Separately run the full release when publishing a matching direct macOS DMG.

## Official references

- [Packaging and distributing with App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)
- [Packaging with Apple's command-line tool](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)
- [Distributing a Safari Web Extension](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
- [Add an App Store Connect record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app)
- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds)

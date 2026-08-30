# Publishing Aria Clip for Safari

This document records the Safari release paths for Aria Clip. Safari Web Extensions are not published by uploading the generated Safari ZIP to a browser-extension store. Apple distributes them inside signed containing apps.

Last verified: 30 August 2026.

## Canonical details

- Product name: **Aria Clip**
- Apple team: uic.nz
- Apple team ID: `N68C9LUA5B`
- App bundle ID: `nz.uic.aria.clip`
- Extension bundle ID: `nz.uic.aria.clip.extension`
- Xcode project: [`xcode/Aria Clip/Aria Clip.xcodeproj`](../xcode/Aria%20Clip/Aria%20Clip.xcodeproj)
- macOS scheme: `Aria Clip (macOS)`
- iOS scheme: `Aria Clip (iOS)`
- Version source of truth: [`package.json`](../package.json)
- Support: <https://docs.aria.bot>
- Marketing site: <https://aria.bot>
- Privacy policy: <https://aria.bot/privacy>

The project already contains iOS and macOS containing-app targets plus their corresponding Safari Web Extension targets.

## Understand the artifacts

| Artifact | Purpose | Upload to App Store Connect |
| --- | --- | --- |
| `builds/aria-clip-<version>-safari.zip` | Intermediate generated web-extension payload | No |
| `builds/aria-clip-<version>-safari.dmg` | Developer ID-signed and notarized direct macOS distribution | No |
| Xcode macOS archive | Mac App Store and TestFlight submission | Yes, through Xcode |
| Xcode iOS archive | iPhone and iPad App Store and TestFlight submission | Yes, through Xcode |

The current `bun run release` process creates the direct-distribution DMG. It does not archive or upload App Store builds. A successful full release removes the intermediate Safari ZIP.

## Choose a distribution path

There are two valid Apple distribution routes:

1. **App Store distribution** — publish the macOS and iOS containing apps through App Store Connect. This is the normal public Safari-extension route and supports Mac, iPhone, and iPad.
2. **Direct macOS distribution** — publish a Developer ID-signed and notarized DMG from GitHub or the product website. This supports macOS only and does not create an App Store listing.

Both routes may be maintained. The DMG does not replace the App Store submission, and the App Store submission does not create the GitHub DMG.

## App Store preparation

Before starting the submission:

1. Use the latest stable release of Xcode supported by App Store Connect. Do not rely on a beta Xcode for the production upload.
2. Confirm the latest Apple Developer Program agreements have been accepted.
3. Confirm the app and extension identifiers exist for team `N68C9LUA5B` and automatic signing resolves correctly.
4. Confirm `https://aria.bot/privacy`, `https://docs.aria.bot`, and `https://aria.bot` are publicly reachable.
5. Decide whether the iOS display name should remain `Clip`; the macOS display name is `Aria Clip`.
6. Increment the Xcode build number for every uploaded build. The repository currently uses `CURRENT_PROJECT_VERSION`; it is independent from the user-facing version in `package.json`.
7. Build and test the generated Safari extension:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build:safari
```

The build synchronizes the marketing version from `package.json` into Xcode.

## Create the App Store Connect record

1. Open [App Store Connect](https://appstoreconnect.apple.com/).
2. Open **Apps**, select the add button, and choose **New App**.
3. Select both **iOS** and **macOS** so they are represented by one cross-platform app record.
4. Enter:

   - Name: `Aria Clip`
   - Primary language: the intended listing language
   - Bundle ID: `nz.uic.aria.clip`
   - SKU: `aria-clip`
   - User access: the appropriate uic.nz team access

5. Create the record and resolve any identifier or agreement errors before attempting an upload.

Apple requires the app record to exist before a build is uploaded. Its [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app) guide describes the current fields and roles.

## Archive and upload macOS

1. Open `xcode/Aria Clip/Aria Clip.xcodeproj` in stable Xcode.
2. Select the `Aria Clip (macOS)` scheme.
3. Select the generic macOS archive destination rather than a development-only local destination.
4. Choose **Product → Archive**.
5. In Xcode Organizer, select the new archive and choose **Validate App**.
6. Resolve signing, entitlement, bundle-association, privacy-manifest, and packaging errors.
7. Choose **Distribute App → App Store Connect** or **TestFlight & App Store**, using the wording shown by the installed Xcode version.
8. Upload the build and wait for App Store Connect to process it.

## Archive and upload iOS

1. Select the `Aria Clip (iOS)` scheme.
2. Select **Any iOS Device** or the current generic iOS archive destination.
3. Choose **Product → Archive**.
4. In Organizer, validate the archive.
5. Resolve all validation errors.
6. Distribute it to **App Store Connect** or **TestFlight & App Store**.
7. Wait for processing to complete before selecting the build in App Store Connect.

Each platform has its own archive and platform-specific listing material, even when both are part of one App Store record. Apple documents build upload and processing in [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).

## Complete the App Store listing

Complete the required information separately for the iOS and macOS platform pages:

- Description, subtitle, keywords, category, copyright, and age rating
- Support URL: `https://docs.aria.bot`
- Marketing URL: `https://aria.bot`
- Privacy-policy URL: `https://aria.bot/privacy`
- App Privacy questionnaire
- Availability and pricing
- Required Mac, iPhone, and iPad screenshots
- App Review contact details
- App Review notes and any required test credentials
- Release choice: manual, automatic, or phased where Apple permits it

Review notes should explain that the containing app installs Aria Clip's Safari Web Extension and should provide exact enabling and testing steps. Include representative tests for capture, templates, interpretation, highlights, reader mode, settings, and saving.

## TestFlight and App Review

1. Assign the processed macOS and iOS builds to TestFlight first.
2. Test installation, Safari extension enablement, upgrades, and removal on real devices where possible.
3. Confirm the extension operates correctly with a clean Safari profile and with no development tooling installed.
4. Select the approved build for each platform version in App Store Connect.
5. Complete all outstanding compliance and privacy questions.
6. Add both platform versions to the App Review submission and submit.
7. Monitor App Store Connect and the uic.nz review email for questions or rejections.

Apple describes the archive and App Store workflow in [Distributing your Safari web extension](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

## Direct macOS distribution

The existing release pipeline creates the GitHub-ready macOS deliverable:

```sh
bun run release
```

It performs the following work:

1. Runs type checking and tests.
2. Builds the browser distributions.
3. Archives and exports the `Aria Clip (macOS)` containing app with a Developer ID Application identity.
4. Creates `builds/aria-clip-<version>-safari.dmg`.
5. Signs and verifies the DMG.
6. Submits it to Apple's notarization service using the `aria-notarytool` Keychain profile.
7. Staples and validates the notarization ticket.

The direct-distribution DMG may be attached to a GitHub release or hosted on the product site. Users install the containing app and then enable Aria Clip in Safari. It is not usable as an iOS distribution and must not be uploaded as the App Store build.

Use this only for local packaging tests when notarization is intentionally unnecessary:

```sh
bun run release -- --skip-notarize
```

Do not publish a skip-notarize build as the official direct download.

## Publish an update

1. Bump the version in `package.json`.
2. Increment the Xcode build number to a value never previously uploaded for that version.
3. Build and test Safari.
4. Archive and validate both platform schemes in stable Xcode.
5. Upload both archives to the existing App Store Connect record.
6. Update release notes, screenshots, privacy answers, reviewer notes, and metadata when behavior changed.
7. Test the processed builds with TestFlight.
8. Submit both platform updates for review.
9. Separately run the complete release if a matching notarized macOS DMG should be published on GitHub.

## Repository work still required

The repository is ready to build Safari's containing apps, but App Store publication is not yet automated. Before the first Apple submission, complete these checks:

- Use a stable Xcode installation for validation and upload.
- Confirm the public privacy-policy URL works.
- Decide whether to rename the iOS containing app from `Clip` to `Aria Clip`.
- Establish and consistently increment the App Store build number.
- Run a real validation archive for both schemes and resolve anything Xcode or App Store Connect reports.
- Optionally extend the release tooling with separate App Store archive and upload commands while preserving the existing notarized-DMG path.

## Official references

- [Distributing your Safari web extension](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
- [Packaging and distributing Safari Web Extensions with App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)
- [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app)
- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds)
- [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots)

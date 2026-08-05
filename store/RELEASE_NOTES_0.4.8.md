# BL Search 0.4.8

Release candidate for Chrome Web Store submission.

## Changes

- Added support for public LinkedIn Jobs search cards, allowing reviewers and
  users to verify filtering without signing in to LinkedIn.
- Added a cold-start regression test that verifies the **Block**
  control is rendered on a public job card.
- Fixed LinkedIn SPA transitions where selecting another recommended job
  changes only the `currentJobId` query parameter on `/jobs/search-results/`.
- Added support for the newer `/jobs/search-results/` card markup, including
  recommendation links that identify jobs through `currentJobId` instead of a
  `/jobs/view/` URL.
- Added semantic discovery for obfuscated recommendation cards through their
  accessible `Dismiss … job` controls and stopped treating detail-panel links,
  feedback controls, and footer links as job cards.
- Unified classic and obfuscated discovery at the outermost visual-card
  boundary, preventing duplicate controls and ensuring blocking hides the
  complete card rather than only an inner text fragment.
- Moved the compact icon-and-**Block** control to the bottom-right corner of
  each card without adding an extra content row.
- Prevented virtualized infinite-scroll viewports from being selected as card
  hosts by validating the visual box dimensions and scroll extent.
- Reduced repeated extension-storage reads while LinkedIn updates job results.
- Kept duplicate-grouping preferences synchronized across open LinkedIn tabs.
- Added strict validation for decrypted cloud-vault records before merging them
  into local extension storage.
- Retained support for LinkedIn client-side navigation and Jobs preload frames.

## Package

Build the upload artifact from the repository root:

```sh
./scripts/package-extension.sh
```

Expected output:

```text
dist/bl-search-extension-v0.4.8-store.zip
```

# BL Search 0.4.8

Release candidate for Chrome Web Store submission.

## Changes

- Added support for public LinkedIn Jobs search cards, allowing reviewers and
  users to verify filtering without signing in to LinkedIn.
- Added a cold-start regression test that verifies the **Block company**
  control is rendered on a public job card.
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

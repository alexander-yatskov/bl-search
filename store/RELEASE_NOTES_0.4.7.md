# BL Search 0.4.7

Release candidate for Chrome Web Store submission.

## Changes

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
dist/bl-search-extension-v0.4.7-store.zip
```

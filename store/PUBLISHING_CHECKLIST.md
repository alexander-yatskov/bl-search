# Chrome Web Store publishing checklist

## Package

- Manifest V3 package built from `extension/`.
- `manifest.json` is at the ZIP root.
- Version matches the release version.
- No tests, server source, CRX, PEM, or private keys are included.
- No remote executable code is loaded.
- Only production permissions are declared.
- Required permissions are limited to `storage` and LinkedIn content-script
  access; the BL Search API origin remains optional.
- LinkedIn `all_frames` behavior is documented as necessary for the same-origin
  Jobs preload frame.

## Developer account

- Chrome Web Store developer registration completed.
- One-time registration fee paid.
- Developer identity and contact details verified.
- Two-step verification enabled on the Google account.

## Store listing

- Name and descriptions copied from `STORE_LISTING.md`.
- Category set to Productivity.
- Homepage, support, and privacy-policy URLs entered.
- 128×128 icon uploaded.
- At least one 1280×800 screenshot uploaded.
- A 1280×800 screenshot visibly demonstrates controls on LinkedIn job cards.
- 440×280 small promotional image uploaded.
- Listing text and media accurately reflect current behavior.

## Privacy

- Single purpose entered exactly as documented.
- Every permission justified.
- LinkedIn SPA and `/preload/` frame processing disclosed.
- Website-content and authentication-information handling disclosed.
- Optional encrypted synchronization disclosed.
- Limited Use certification completed.
- Privacy policy URL is publicly accessible.

## Distribution and review

- Distribution countries selected.
- Visibility selected: Public, Unlisted, or Private.
- Reviewer test instructions entered.
- Deferred publishing selected for the first submission.
- Package uploaded and validation warnings resolved.
- Submission reviewed one final time before **Submit for Review**.

## Post-publication

- Store listing opened in a signed-out browser.
- Installation and first-run flow tested from the Store.
- Privacy-policy and support links verified.
- Published version recorded in the repository.
- Recovery and rollback plan documented for the next update.

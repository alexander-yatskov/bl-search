# Chrome Web Store publishing guide

This guide describes the first publication of BL Search. It complements the
values in `STORE_LISTING.md` and the checks in `PUBLISHING_CHECKLIST.md`.

## 1. Build the package

From the repository root:

```sh
./scripts/package-extension.sh
```

For version 0.4.6, the upload file is:

```text
dist/bl-search-extension-v0.4.6-store.zip
```

The archive contains only runtime extension files. `manifest.json` is at its
root. Server source, tests, Store media, CRX files, and PEM keys are excluded.

## 2. Register the publisher

1. Open the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with the Google account that will own the extension.
3. Complete developer registration and pay Google's one-time registration
   fee.
4. Complete identity and contact verification requested by the Dashboard.
5. Enable two-step verification on the publisher account.

Publisher ownership should use an account that can be recovered independently
of a single workstation.

## 3. Create the item

1. Select **New item** or **Add new item**.
2. Upload `dist/bl-search-extension-v0.4.6-store.zip`.
3. Resolve every package validation error before continuing.
4. Confirm that the Dashboard shows version `0.4.6`.

Google's current upload workflow is documented in
[Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish).

## 4. Complete the Store listing

Copy the product name, short description, detailed description, category,
homepage URL, support URL, and privacy-policy URL from `STORE_LISTING.md`.

Upload:

- `store/assets/icon128.png`;
- `store/assets/screenshot-options-1280x800.png`;
- `store/assets/small-promo-440x280.png`.

The listing must accurately describe the current extension behavior. It must
not imply affiliation with LinkedIn.

## 5. Complete Privacy practices

Enter the single-purpose statement and permission justifications from
`STORE_LISTING.md`.

The data declarations must disclose:

- website content processed from job cards on LinkedIn Jobs pages and its
  same-origin preload frames;
- user-generated company blocklist data;
- the recovery secret and derived authentication token used by optional sync;
- local storage of preferences and sync configuration;
- optional transmission of encrypted blocklist data to the BL Search API.

Cloud sync is disabled by default. The options page provides a prominent
disclosure before the actions that request API access and enable cloud
processing.

The Limited Use certification must be completed consistently with
`PRIVACY.md`. The privacy policy must be publicly accessible at the URL entered
in the Dashboard before the item is submitted.

Google's current privacy form is documented in
[Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

## 6. Configure distribution

1. Choose **Public**, **Unlisted**, or **Private** visibility.
2. Select the countries where the extension will be available.
3. Keep the item free unless a separate commercial model is intentionally
   introduced.

For the first beta, **Unlisted** limits discovery while allowing installation
through the Store URL. **Public** makes the listing searchable.

## 7. Add reviewer instructions

Copy the reviewer test instructions from `STORE_LISTING.md`.

The reviewer needs a LinkedIn session to verify job-card behavior. No BL Search
account or credentials are required. Local blocklist settings can be reviewed
without LinkedIn authentication.

## 8. Submit for review

1. Review Package, Store listing, Privacy practices, Distribution, and Test
   instructions.
2. Select deferred publishing for the first submission.
3. Select **Submit for Review**.
4. Monitor the Dashboard and publisher email for reviewer questions.

Deferred publishing prevents immediate public availability after approval.
After approval, Google currently allows a limited window to publish the staged
item before it returns to draft.

## 9. Verify the approved item

After publication:

1. Open the Store listing while signed out.
2. Install the Store build in a clean browser profile.
3. Verify first-run options, LinkedIn SPA navigation and preload-frame job
   filtering, company removal, cloud permission request, encrypted
   synchronization, and cloud-vault deletion.
4. Verify the privacy-policy and support links.
5. Record the assigned Chrome Web Store item ID.

## 10. Publish updates

Every update must:

1. increment `version` in `extension/manifest.json`;
2. rebuild the Store ZIP;
3. rerun JavaScript, package, and visual checks;
4. update privacy disclosures if data handling or permissions changed;
5. upload the new ZIP to the existing Store item;
6. submit the update for review.

The private PEM created by Brave's local **Pack extension** flow is not used by
Chrome Web Store uploads and must never be committed or uploaded.

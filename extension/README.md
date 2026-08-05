# BL Search extension

The unpacked extension locally:

- hides LinkedIn job cards from blocked companies;
- groups loaded postings with the same normalized company and title;
- displays the locations found in each group.

No LinkedIn page data or cookies are sent anywhere. When cloud sync is enabled,
only an encrypted blocklist and an authentication token derived from the
recovery secret are sent to the configured BL Search API.

## First run and cloud permission

The options page opens after installation. The extension stays local unless
the user explicitly creates or connects a cloud vault.

When the user clicks **Create cloud vault** or **Connect vault**, Chrome asks
for permission to contact only the BL Search API origin embedded in
`config.js`. No API host permission is requested during installation, and the
user never has to enter an API URL. LinkedIn access is granted at installation
because the local filtering feature runs directly on LinkedIn Jobs pages and
their same-origin preload frames.

The extension creates a recovery code:

```text
bls1.<vault-id>.<master-secret>
```

The recovery code is the only way to connect another device. There is no email
account and no password-recovery flow.

## Configure

Open the extension details and choose **Extension options**. Add one company
with the form, or click the extension toolbar icon. A company can also be
blocked directly from a loaded job card.

Use the **Remove** button next to a company in options to unblock it. When cloud
sync is connected, the removal is stored as a tombstone and propagated to
other devices.

The cloud section also provides:

- **Sync now** for a manual refresh;
- **Disconnect this device**, which keeps local companies and forgets the
  recovery secret on that device;
- **Delete cloud vault**, which removes the server-side vault but keeps the
  local blocklist.

## Production API endpoint

The public API endpoint is part of the extension build:

```js
globalThis.BLSearchConfig = Object.freeze({
  API_ENDPOINT: "https://c418o3x5o5.execute-api.eu-central-1.amazonaws.com"
});
```

It is also listed explicitly in `optional_host_permissions` in `manifest.json`.
The endpoint is not a secret. For a store release, a stable custom domain is
preferable so replacing API Gateway does not require publishing a new extension
version.

## Current deduplication rule

The current version groups postings by:

```text
normalized company name + normalized job title
```

This first-pass heuristic can group distinct openings that share a title,
because LinkedIn list cards usually do not contain a requisition ID or full job
description.

## Testing checklist

- A compact icon-and-**Block** button appears on loaded job cards.
- Blocking a company hides all its currently loaded cards.
- The options page can add and remove blocked companies.
- Repeated company/title cards collapse into the first card.
- The remaining card shows posting count and collected locations.
- Disabling grouping in options restores duplicate cards.

LinkedIn changes its HTML frequently. If no controls appear, inspect a job card
and update the selectors near the top of `content.js`.

LinkedIn uses client-side navigation and may render Jobs content in a
same-origin `/preload/` frame. The manifest therefore registers the content
script for `https://www.linkedin.com/*` with `all_frames`; `content.js` limits
processing to Jobs and preload routes and reads only detected job cards.

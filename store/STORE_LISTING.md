# Chrome Web Store listing

## Product details

Name:

```text
BL Search
```

Category:

```text
Productivity
```

Language:

```text
English
```

Homepage URL:

```text
https://github.com/alexander-yatskov/bl-search
```

Support URL:

```text
https://github.com/alexander-yatskov/bl-search/issues
```

Privacy policy URL:

```text
https://github.com/alexander-yatskov/bl-search/blob/main/PRIVACY.md
```

## Short description

```text
Hide blocked companies and group similar LinkedIn job postings with optional encrypted sync.
```

## Detailed description

```text
BL Search makes LinkedIn Jobs search results easier to review.

• Hide every loaded job card from companies on a personal blocklist.
• Add a company to the blocklist directly from a job card.
• Group similar postings from the same company and display their locations.
• Manage and remove blocked companies from a dedicated settings page.
• Optionally synchronize an end-to-end encrypted blocklist between devices.

The extension works locally by default and requires no account or email
address. Cloud sync is optional and uses a randomly generated recovery code.
The company blocklist is encrypted in the browser before upload. LinkedIn
cookies and job-page content are never sent to the BL Search service.

Current duplicate detection uses normalized company and job title. Distinct
openings with the same title can occasionally be grouped together.

BL Search is an independent open-source project and is not affiliated with
LinkedIn.
```

## Single purpose

```text
Improve LinkedIn Jobs search results by hiding companies selected by the user
and grouping similar job postings.
```

## Permission justifications

### `storage`

```text
Stores the user's company blocklist, removal timestamps, duplicate-grouping
preference, and optional encrypted-sync configuration in extension storage.
```

### `https://www.linkedin.com/jobs/*`

```text
Required to read and update job cards displayed on LinkedIn Jobs pages. The
extension extracts company name, job title, location, job URL, and job ID to
apply the blocklist and group similar cards. This content is processed locally
and is not sent to the BL Search service.
```

### Optional BL Search API host

```text
Requested only after the user explicitly creates or connects an encrypted
cloud vault. It transmits the encrypted blocklist, random vault ID, and derived
authentication token over HTTPS for synchronization between devices.
```

## Data-use declarations

Website content:

```text
Yes. Company names, job titles, locations, job URLs, and job IDs are processed
locally to filter and group LinkedIn Jobs cards.
```

User-generated content:

```text
Yes. The personal company blocklist is stored locally and, only when cloud sync
is enabled, transmitted as end-to-end encrypted ciphertext.
```

Authentication information:

```text
The optional sync feature uses a random recovery secret and a derived
authentication token. LinkedIn authentication information and cookies are not
accessed.
```

The extension does not collect personally identifiable information, health
information, financial information, personal communications, location history,
or browsing history. It does not track navigation; it processes only the
content of displayed LinkedIn Jobs pages.

Limited Use certification:

```text
Data is used only to provide the extension's user-facing filtering, grouping,
and encrypted synchronization features. It is not sold, used for advertising,
transferred to data brokers, or used for creditworthiness. Human access to
encrypted cloud blocklists is not provided.
```

## Reviewer test instructions

```text
1. Install the extension and open its options page.
2. Add "Example Company" under Blocked companies.
3. Open https://www.linkedin.com/jobs/ while signed in to LinkedIn.
4. Search for jobs and confirm that each loaded card has a "Block company"
   button.
5. Blocking a company hides all currently loaded cards from that company.
6. Return to extension options and use "Remove" to unblock it.
7. Similar loaded cards with the same normalized company and title collapse
   into one card when duplicate grouping is enabled.
8. Cloud sync is optional. Clicking "Create cloud vault" displays Chrome's
   permission request for the BL Search API, then creates a recovery code.
9. "Delete cloud vault" removes the encrypted remote vault while preserving
   the local blocklist.

No test account is provided. LinkedIn page testing requires the reviewer's own
LinkedIn session. All local settings features can be reviewed without LinkedIn
authentication.
```

## Required media

- `store/assets/icon128.png`
- `store/assets/screenshot-options-1280x800.png`
- `store/assets/small-promo-440x280.png`

Optional:

- `store/assets/screenshot-linkedin-1280x800.png`
- `store/assets/marquee-1400x560.png`

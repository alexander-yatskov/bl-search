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

### `https://www.linkedin.com/*`

```text
Required to detect client-side navigation into LinkedIn Jobs and to read and
update job cards displayed there. LinkedIn uses SPA navigation and renders Jobs
content in same-origin /preload/ frames, so the content script is registered for
matching LinkedIn frames before navigation completes. It reads only job-card
fields: company name, job title, location, job URL, and job ID. These fields are
processed locally to apply the blocklist and group similar cards and are not
sent to the BL Search service. Unrelated LinkedIn page content is not processed.
```

### Optional BL Search API host

```text
Requested only after the user explicitly creates or connects an encrypted
cloud vault. It transmits the encrypted blocklist, random vault ID, and derived
authentication token over HTTPS for synchronization between devices.
```

## Data-use declarations

Use the following selections in the current Chrome Web Store data-disclosure
form.

### Personally identifiable information

```text
No. BL Search does not request or process the user's name, address, email
address, age, identification number, LinkedIn profile information, or similar
identifiers.
```

### Health information

```text
No. BL Search does not request or process health or medical information.
```

### Financial and payment information

```text
No. BL Search does not request or process transactions, payment details,
credit information, or financial records.
```

### Authentication information

```text
Yes, only for optional BL Search cloud synchronization. The extension generates
a random recovery secret locally and derives a separate authentication token
from it. The recovery secret remains in Chrome extension storage; the derived
token is sent to the BL Search API over HTTPS, where only its hash is stored.
LinkedIn passwords, cookies, session tokens, and other LinkedIn credentials are
not accessed.
```

### Personal communications

```text
No. BL Search does not request or process emails, text messages, chats, LinkedIn
messages, or other personal communications.
```

### Location

```text
No. BL Search does not determine or collect the user's physical location, IP
address, GPS coordinates, or nearby-device information. A location written on
a LinkedIn job card describes the job and is treated as Website content, not as
the user's location.
```

### Web history

```text
No. BL Search does not build or transmit a list of pages visited, page titles,
or visit times. It reacts only to the currently displayed LinkedIn Jobs page so
it can provide its user-facing filtering and grouping functionality.
```

### User activity

```text
No. BL Search does not monitor clicks, mouse movement, scrolling, keystrokes,
or network activity. Its own “Block company” controls handle only the clicks
needed to perform the action requested by the user.
```

### Website content

```text
Yes. Company names, job titles, locations, job URLs, and job IDs are processed
locally to filter and group LinkedIn Jobs cards. This job-card content is not
sent to the BL Search service. Company names explicitly added by the user to
the blocklist are stored locally and, only when optional cloud sync is enabled,
sent as end-to-end encrypted ciphertext.
```

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
3. While signed in to LinkedIn, open the home feed and navigate to Jobs using
   LinkedIn's navigation without reloading the tab.
4. Search for jobs and confirm that each loaded card has a "Block company"
   button on the first SPA render. LinkedIn may render this list in its internal
   same-origin /preload/ frame.
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

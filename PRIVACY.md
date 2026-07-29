# BL Search Privacy Policy

Effective date: July 29, 2026

BL Search is an independent browser extension developed by Alexander Yatskov.
It improves LinkedIn Jobs search results by maintaining a personal company
blocklist and grouping similar job postings.

## Data processed locally

BL Search reads the following information from LinkedIn Jobs pages displayed in
the browser:

- company name;
- job title;
- job location;
- LinkedIn job identifier and job URL.

This website content is used only to hide blocked companies and group similar
job cards. It is processed locally in the browser and is not transmitted to the
BL Search service.

The extension stores the following data in Chrome extension storage:

- blocked company names;
- timestamps used to synchronize additions and removals;
- the duplicate-grouping preference;
- cloud-vault configuration and recovery secret when cloud sync is enabled.

BL Search does not access or transmit LinkedIn cookies, account credentials,
applications, messages, contacts, or profile information.

## Optional encrypted cloud sync

Cloud sync is disabled by default and requires an explicit action in the
extension settings.

When cloud sync is enabled, the company blocklist is encrypted in the browser
with AES-256-GCM before transmission. The encryption and authentication keys
are derived separately from a randomly generated recovery secret. The service
receives:

- a random vault identifier;
- the encrypted blocklist;
- an authentication token derived from the recovery secret;
- synchronization revision and timestamp metadata.

The service stores a hash of the authentication token rather than the token
itself. The recovery secret and plaintext blocklist are not sent to the
service. Data is transmitted over HTTPS and stored using Amazon Web Services
infrastructure.

## Data use and sharing

Data is used only to provide the blocklist, duplicate grouping, and optional
encrypted synchronization features. BL Search:

- does not sell user data;
- does not use user data for advertising or creditworthiness;
- does not transfer user data to data brokers;
- does not allow humans to read cloud blocklists;
- does not use website content for purposes unrelated to the extension's
  single purpose.

Use of information received from Chrome APIs complies with the Chrome Web Store
User Data Policy, including its Limited Use requirements.

## Retention and deletion

Local extension data remains in browser storage until it is removed in the
extension settings, the extension is uninstalled, or browser storage is
cleared.

An encrypted cloud vault remains until **Delete cloud vault** is used in the
extension settings. Disconnecting a device removes its local cloud
configuration but does not delete the server-side encrypted vault.

## Permissions

BL Search requests only the permissions required for its features:

- `storage` stores the blocklist, preferences, and optional sync
  configuration;
- access to `https://www.linkedin.com/jobs/*` lets the extension process and
  update LinkedIn Jobs cards;
- optional access to the BL Search API is requested only when cloud sync is
  created or connected.

## Security and recovery

The recovery code controls access to an encrypted cloud vault. BL Search has no
email-based account or recovery process. Anyone who obtains the recovery code
may access the encrypted vault, while losing the code makes the vault
unrecoverable.

## Changes

Material changes to data practices will be disclosed in the extension user
interface and this policy before the changed processing begins.

## Contact

Privacy and support requests can be submitted through
[GitHub Issues](https://github.com/alexander-yatskov/bl-search/issues).

BL Search is not affiliated with LinkedIn.

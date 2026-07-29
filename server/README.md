# BL Search server

The server is a single Go Lambda behind API Gateway HTTP API. It stores
client-encrypted vaults in DynamoDB and does not require user accounts, email,
or Cognito.

The extension integration is implemented. It continues to keep a local copy in
`chrome.storage.local` and synchronizes encrypted company records when a cloud
vault is connected.

## API

All requests use a high-entropy token:

```http
Authorization: Bearer <authentication-token>
```

Endpoints:

```text
POST   /v1/vaults
GET    /v1/vaults/{vaultID}
PUT    /v1/vaults/{vaultID}
DELETE /v1/vaults/{vaultID}
```

The client must generate `vaultID`, derive separate encryption and
authentication keys from its recovery secret, and encrypt the blocklist before
sending it. The server stores only the authentication-token hash and
ciphertext.

Updates require the current revision:

```http
If-Match: 1
```

A stale revision returns `409 Conflict`.

## Development

Requirements:

- Go 1.24 or newer;
- AWS SAM CLI for building and deploying;
- AWS credentials for deployment.

Run checks:

```sh
go test ./...
go vet ./...
```

Build with SAM:

```sh
sam build
sam deploy --guided
```

The deployed `APIEndpoint` is public configuration and must be embedded in
`../extension/config.js`. The same origin must be present in the extension's
`optional_host_permissions`. End users should never enter an API URL manually.

The stack creates:

- one `provided.al2023` ARM64 Lambda;
- one API Gateway HTTP API;
- one DynamoDB on-demand table with point-in-time recovery;
- one CloudWatch log group with 14-day retention.

## Security properties

- No plaintext blocklist is sent to the server.
- Wrong vault IDs and wrong tokens both return `404`.
- DynamoDB conditional writes protect revisions from lost updates.
- Request bodies and authorization tokens are not intentionally logged.
- Losing the recovery secret means losing access to the vault.

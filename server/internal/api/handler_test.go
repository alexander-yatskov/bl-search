package api

import (
	"context"
	"crypto/sha256"
	"testing"

	"github.com/aws/aws-lambda-go/events"

	"github.com/ayatskov/bl-search/server/internal/store"
	"github.com/ayatskov/bl-search/server/internal/vault"
)

const (
	testVaultID = "abcdefghijklmnopqrstuvwx"
	testToken   = "01234567890123456789012345678901"
)

type memoryStore struct {
	value *vault.Vault
}

func (s *memoryStore) Create(_ context.Context, value vault.Vault) error {
	if s.value != nil {
		return store.ErrConflict
	}
	s.value = &value
	return nil
}

func (s *memoryStore) Get(_ context.Context, id string) (vault.Vault, error) {
	if s.value == nil || s.value.ID != id {
		return vault.Vault{}, store.ErrNotFound
	}
	return *s.value, nil
}

func (s *memoryStore) Update(_ context.Context, value vault.Vault, expected int64) error {
	if s.value == nil || s.value.Revision != expected {
		return store.ErrConflict
	}
	s.value = &value
	return nil
}

func (s *memoryStore) Delete(_ context.Context, id string, authHash []byte) error {
	if s.value == nil || s.value.ID != id {
		return store.ErrNotFound
	}
	s.value = nil
	return nil
}

func TestVaultLifecycle(t *testing.T) {
	t.Parallel()

	vaultStore := &memoryStore{}
	handler := NewHandler(vaultStore)

	created, err := handler.Handle(context.Background(), request(
		"POST",
		"/v1/vaults",
		"",
		`{"vaultId":"`+testVaultID+`","ciphertext":"encrypted-v1"}`,
		nil,
	))
	if err != nil || created.StatusCode != 201 {
		t.Fatalf("create: status=%d err=%v body=%s", created.StatusCode, err, created.Body)
	}

	fetched, err := handler.Handle(context.Background(), request(
		"GET",
		"/v1/vaults/"+testVaultID,
		testVaultID,
		"",
		nil,
	))
	if err != nil || fetched.StatusCode != 200 {
		t.Fatalf("get: status=%d err=%v body=%s", fetched.StatusCode, err, fetched.Body)
	}

	updated, err := handler.Handle(context.Background(), request(
		"PUT",
		"/v1/vaults/"+testVaultID,
		testVaultID,
		`{"ciphertext":"encrypted-v2"}`,
		map[string]string{"if-match": "1"},
	))
	if err != nil || updated.StatusCode != 200 {
		t.Fatalf("update: status=%d err=%v body=%s", updated.StatusCode, err, updated.Body)
	}

	deleted, err := handler.Handle(context.Background(), request(
		"DELETE",
		"/v1/vaults/"+testVaultID,
		testVaultID,
		"",
		nil,
	))
	if err != nil || deleted.StatusCode != 204 {
		t.Fatalf("delete: status=%d err=%v body=%s", deleted.StatusCode, err, deleted.Body)
	}
}

func TestWrongTokenLooksLikeMissingVault(t *testing.T) {
	t.Parallel()

	sum := sha256.Sum256([]byte(testToken))
	handler := NewHandler(&memoryStore{value: &vault.Vault{
		ID:       testVaultID,
		AuthHash: sum[:],
		Revision: 1,
	}})
	input := request("GET", "/v1/vaults/"+testVaultID, testVaultID, "", nil)
	input.Headers["authorization"] = "Bearer 99999999999999999999999999999999"

	response, err := handler.Handle(context.Background(), input)
	if err != nil || response.StatusCode != 404 {
		t.Fatalf("status=%d err=%v body=%s", response.StatusCode, err, response.Body)
	}
}

func TestUpdateRejectsStaleRevision(t *testing.T) {
	t.Parallel()

	sum := sha256.Sum256([]byte(testToken))
	handler := NewHandler(&memoryStore{value: &vault.Vault{
		ID:         testVaultID,
		AuthHash:   sum[:],
		Ciphertext: "encrypted-v2",
		Revision:   2,
	}})

	response, err := handler.Handle(context.Background(), request(
		"PUT",
		"/v1/vaults/"+testVaultID,
		testVaultID,
		`{"ciphertext":"encrypted-v3"}`,
		map[string]string{"if-match": "1"},
	))
	if err != nil || response.StatusCode != 409 {
		t.Fatalf("status=%d err=%v body=%s", response.StatusCode, err, response.Body)
	}
}

func request(method, path, vaultID, body string, headers map[string]string) events.APIGatewayV2HTTPRequest {
	if headers == nil {
		headers = make(map[string]string)
	}
	headers["authorization"] = "Bearer " + testToken

	pathParameters := make(map[string]string)
	if vaultID != "" {
		pathParameters["vaultID"] = vaultID
	}
	return events.APIGatewayV2HTTPRequest{
		RawPath:        path,
		Headers:        headers,
		PathParameters: pathParameters,
		Body:           body,
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: method,
				Path:   path,
			},
		},
	}
}

package api

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"

	"github.com/ayatskov/bl-search/server/internal/store"
	"github.com/ayatskov/bl-search/server/internal/vault"
)

const maxCiphertextSize = 64 * 1024

var vaultIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{20,128}$`)

type Handler struct {
	store store.VaultStore
	now   func() time.Time
}

type writeRequest struct {
	VaultID    string `json:"vaultId,omitempty"`
	Ciphertext string `json:"ciphertext"`
	Revision   int64  `json:"revision,omitempty"`
}

type vaultResponse struct {
	Ciphertext string `json:"ciphertext"`
	Revision   int64  `json:"revision"`
}

func NewHandler(vaultStore store.VaultStore) *Handler {
	return &Handler{
		store: vaultStore,
		now:   func() time.Time { return time.Now().UTC() },
	}
}

func (h *Handler) Handle(ctx context.Context, request events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	switch {
	case request.RequestContext.HTTP.Method == http.MethodPost &&
		request.RawPath == "/v1/vaults":
		return h.create(ctx, request), nil
	case request.RequestContext.HTTP.Method == http.MethodGet:
		return h.get(ctx, request), nil
	case request.RequestContext.HTTP.Method == http.MethodPut:
		return h.update(ctx, request), nil
	case request.RequestContext.HTTP.Method == http.MethodDelete:
		return h.delete(ctx, request), nil
	default:
		return errorResponse(http.StatusNotFound, "not_found"), nil
	}
}

func (h *Handler) create(ctx context.Context, request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	authHash, ok := authenticationHash(request.Headers)
	if !ok {
		return errorResponse(http.StatusUnauthorized, "unauthorized")
	}

	var input writeRequest
	if !decodeBody(request.Body, &input) ||
		!validVaultID(input.VaultID) ||
		!validCiphertext(input.Ciphertext) {
		return errorResponse(http.StatusBadRequest, "invalid_request")
	}

	now := h.now()
	err := h.store.Create(ctx, vault.Vault{
		ID:         input.VaultID,
		AuthHash:   authHash,
		Ciphertext: input.Ciphertext,
		Revision:   1,
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if errors.Is(err, store.ErrConflict) {
		return errorResponse(http.StatusConflict, "vault_exists")
	}
	if err != nil {
		log.Printf("create vault: %v", err)
		return errorResponse(http.StatusInternalServerError, "internal_error")
	}

	return jsonResponse(http.StatusCreated, vaultResponse{
		Ciphertext: input.Ciphertext,
		Revision:   1,
	})
}

func (h *Handler) get(ctx context.Context, request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	value, authHash, response, ok := h.authenticatedVault(ctx, request)
	if !ok {
		return response
	}
	_ = authHash

	return jsonResponse(http.StatusOK, vaultResponse{
		Ciphertext: value.Ciphertext,
		Revision:   value.Revision,
	})
}

func (h *Handler) update(ctx context.Context, request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	value, _, response, ok := h.authenticatedVault(ctx, request)
	if !ok {
		return response
	}

	var input writeRequest
	if !decodeBody(request.Body, &input) || !validCiphertext(input.Ciphertext) {
		return errorResponse(http.StatusBadRequest, "invalid_request")
	}

	expectedRevision, err := strconv.ParseInt(request.Headers["if-match"], 10, 64)
	if err != nil || expectedRevision < 1 || expectedRevision != value.Revision {
		return errorResponse(http.StatusConflict, "revision_conflict")
	}

	value.Ciphertext = input.Ciphertext
	value.Revision++
	value.UpdatedAt = h.now()
	if err := h.store.Update(ctx, value, expectedRevision); errors.Is(err, store.ErrConflict) {
		return errorResponse(http.StatusConflict, "revision_conflict")
	} else if err != nil {
		log.Printf("update vault: %v", err)
		return errorResponse(http.StatusInternalServerError, "internal_error")
	}

	return jsonResponse(http.StatusOK, vaultResponse{
		Ciphertext: value.Ciphertext,
		Revision:   value.Revision,
	})
}

func (h *Handler) delete(ctx context.Context, request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	value, authHash, response, ok := h.authenticatedVault(ctx, request)
	if !ok {
		return response
	}

	if err := h.store.Delete(ctx, value.ID, authHash); err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			log.Printf("delete vault: %v", err)
		}
		return errorResponse(http.StatusNotFound, "not_found")
	}
	return events.APIGatewayV2HTTPResponse{StatusCode: http.StatusNoContent}
}

func (h *Handler) authenticatedVault(
	ctx context.Context,
	request events.APIGatewayV2HTTPRequest,
) (vault.Vault, []byte, events.APIGatewayV2HTTPResponse, bool) {
	id := request.PathParameters["vaultID"]
	authHash, ok := authenticationHash(request.Headers)
	if !ok || !validVaultID(id) {
		return vault.Vault{}, nil, errorResponse(http.StatusNotFound, "not_found"), false
	}

	value, err := h.store.Get(ctx, id)
	if errors.Is(err, store.ErrNotFound) {
		return vault.Vault{}, nil, errorResponse(http.StatusNotFound, "not_found"), false
	}
	if err != nil {
		log.Printf("get vault: %v", err)
		return vault.Vault{}, nil, errorResponse(http.StatusInternalServerError, "internal_error"), false
	}
	if subtle.ConstantTimeCompare(value.AuthHash, authHash) != 1 {
		return vault.Vault{}, nil, errorResponse(http.StatusNotFound, "not_found"), false
	}
	return value, authHash, events.APIGatewayV2HTTPResponse{}, true
}

func authenticationHash(headers map[string]string) ([]byte, bool) {
	authorization := headers["authorization"]
	const prefix = "Bearer "
	if !strings.HasPrefix(authorization, prefix) {
		return nil, false
	}
	token := strings.TrimPrefix(authorization, prefix)
	if len(token) < 32 || len(token) > 512 {
		return nil, false
	}
	sum := sha256.Sum256([]byte(token))
	return sum[:], true
}

func validVaultID(id string) bool {
	return vaultIDPattern.MatchString(id)
}

func validCiphertext(value string) bool {
	return len(value) > 0 && len(value) <= maxCiphertextSize
}

func decodeBody(body string, target any) bool {
	if len(body) == 0 || len(body) > maxCiphertextSize+1024 {
		return false
	}
	decoder := json.NewDecoder(strings.NewReader(body))
	decoder.DisallowUnknownFields()
	return decoder.Decode(target) == nil
}

func jsonResponse(status int, value any) events.APIGatewayV2HTTPResponse {
	body, err := json.Marshal(value)
	if err != nil {
		return errorResponse(http.StatusInternalServerError, "internal_error")
	}
	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers:    map[string]string{"content-type": "application/json"},
		Body:       string(body),
	}
}

func errorResponse(status int, code string) events.APIGatewayV2HTTPResponse {
	return jsonResponse(status, map[string]string{"error": code})
}

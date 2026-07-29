package store

import (
	"context"
	"errors"

	"github.com/ayatskov/bl-search/server/internal/vault"
)

var (
	ErrConflict = errors.New("vault conflict")
	ErrNotFound = errors.New("vault not found")
)

type VaultStore interface {
	Create(context.Context, vault.Vault) error
	Get(context.Context, string) (vault.Vault, error)
	Update(context.Context, vault.Vault, int64) error
	Delete(context.Context, string, []byte) error
}

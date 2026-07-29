package vault

import "time"

type Vault struct {
	ID         string    `dynamodbav:"vault_id"`
	AuthHash   []byte    `dynamodbav:"auth_hash"`
	Ciphertext string    `dynamodbav:"ciphertext"`
	Revision   int64     `dynamodbav:"revision"`
	CreatedAt  time.Time `dynamodbav:"created_at"`
	UpdatedAt  time.Time `dynamodbav:"updated_at"`
}

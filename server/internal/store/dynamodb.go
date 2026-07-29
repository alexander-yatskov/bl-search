package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/ayatskov/bl-search/server/internal/vault"
)

type dynamoDBAPI interface {
	PutItem(context.Context, *dynamodb.PutItemInput, ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error)
	GetItem(context.Context, *dynamodb.GetItemInput, ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
	DeleteItem(context.Context, *dynamodb.DeleteItemInput, ...func(*dynamodb.Options)) (*dynamodb.DeleteItemOutput, error)
}

type DynamoDB struct {
	client    dynamoDBAPI
	tableName string
}

func NewDynamoDB(client dynamoDBAPI, tableName string) *DynamoDB {
	return &DynamoDB{client: client, tableName: tableName}
}

func (s *DynamoDB) Create(ctx context.Context, value vault.Vault) error {
	item, err := attributevalue.MarshalMap(value)
	if err != nil {
		return fmt.Errorf("marshal vault: %w", err)
	}

	_, err = s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           &s.tableName,
		Item:                item,
		ConditionExpression: stringPtr("attribute_not_exists(vault_id)"),
	})
	if isConditionalFailure(err) {
		return ErrConflict
	}
	if err != nil {
		return fmt.Errorf("put vault: %w", err)
	}
	return nil
}

func (s *DynamoDB) Get(ctx context.Context, id string) (vault.Vault, error) {
	result, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName:      &s.tableName,
		Key:            idKey(id),
		ConsistentRead: boolPtr(true),
	})
	if err != nil {
		return vault.Vault{}, fmt.Errorf("get vault: %w", err)
	}
	if len(result.Item) == 0 {
		return vault.Vault{}, ErrNotFound
	}

	var value vault.Vault
	if err := attributevalue.UnmarshalMap(result.Item, &value); err != nil {
		return vault.Vault{}, fmt.Errorf("unmarshal vault: %w", err)
	}
	return value, nil
}

func (s *DynamoDB) Update(ctx context.Context, value vault.Vault, expectedRevision int64) error {
	item, err := attributevalue.MarshalMap(value)
	if err != nil {
		return fmt.Errorf("marshal vault: %w", err)
	}

	_, err = s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &s.tableName,
		Item:      item,
		ConditionExpression: stringPtr(
			"auth_hash = :auth_hash AND revision = :expected_revision",
		),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":auth_hash":         &types.AttributeValueMemberB{Value: value.AuthHash},
			":expected_revision": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", expectedRevision)},
		},
	})
	if isConditionalFailure(err) {
		return ErrConflict
	}
	if err != nil {
		return fmt.Errorf("update vault: %w", err)
	}
	return nil
}

func (s *DynamoDB) Delete(ctx context.Context, id string, authHash []byte) error {
	_, err := s.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: &s.tableName,
		Key:       idKey(id),
		ConditionExpression: stringPtr(
			"auth_hash = :auth_hash",
		),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":auth_hash": &types.AttributeValueMemberB{Value: authHash},
		},
	})
	if isConditionalFailure(err) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("delete vault: %w", err)
	}
	return nil
}

func idKey(id string) map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"vault_id": &types.AttributeValueMemberS{Value: id},
	}
}

func isConditionalFailure(err error) bool {
	var target *types.ConditionalCheckFailedException
	return errors.As(err, &target)
}

func boolPtr(value bool) *bool       { return &value }
func stringPtr(value string) *string { return &value }

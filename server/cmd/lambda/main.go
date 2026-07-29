package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/ayatskov/bl-search/server/internal/api"
	"github.com/ayatskov/bl-search/server/internal/store"
)

func main() {
	tableName := os.Getenv("TABLE_NAME")
	if tableName == "" {
		log.Fatal("TABLE_NAME is required")
	}

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("load AWS configuration: %v", err)
	}

	vaultStore := store.NewDynamoDB(dynamodb.NewFromConfig(cfg), tableName)
	handler := api.NewHandler(vaultStore)
	lambda.Start(handler.Handle)
}

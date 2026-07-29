.PHONY: build-VaultFunction test vet fmt

build-VaultFunction:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build \
		-tags lambda.norpc \
		-ldflags="-s -w" \
		-o "$(ARTIFACTS_DIR)/bootstrap" \
		./cmd/lambda

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -w $$(find . -name '*.go' -type f)

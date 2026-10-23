# generating ogen files
generate:
	ogen --target internal/http_adapter/router/generated --package generated --clean api/openapi.yaml
	go mod tidy

# run backend
start:
	go run cmd/app/main.go
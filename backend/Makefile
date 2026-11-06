# generating ogen files
generate:
	go run github.com/ogen-go/ogen/cmd/ogen@v1.24.0 --target internal/http_adapter/router/generated --package generated --clean ../common/openapi.yaml
	go mod tidy

# run backend
start:
	go run cmd/app/main.go

# generating ogen files
generate:
<<<<<<< Updated upstream
	ogen --target internal/http_adapter/router/generated --package generated --clean api/openapi.yaml
=======
	go run github.com/ogen-go/ogen/cmd/ogen@v1.24.0 --target internal/http_adapter/router/generated --package generated --clean api/openapi.yaml
>>>>>>> Stashed changes
	go mod tidy

# run backend
start:
	go run cmd/app/main.go
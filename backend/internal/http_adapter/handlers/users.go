package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) CreateUser(ctx context.Context, req *api.CreateUserRequest) (api.CreateUserRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteUser(ctx context.Context, params api.DeleteUserParams) (api.DeleteUserRes, error) {
	return nil, ht.ErrNotImplemented
}

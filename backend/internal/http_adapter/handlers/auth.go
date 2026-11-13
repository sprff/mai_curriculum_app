package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) AuthLogin(ctx context.Context, req *api.LoginRequest) (api.AuthLoginRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) AuthLogout(ctx context.Context, req *api.RefreshTokenRequest) (api.AuthLogoutRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) AuthMe(ctx context.Context) (api.AuthMeRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) AuthRefresh(ctx context.Context, req *api.RefreshTokenRequest) (api.AuthRefreshRes, error) {
	return nil, ht.ErrNotImplemented
}

package handlers

import (
	api "backend/internal/http_adapter/router/generated"
	"context"
)

func (h *Handler) Ping(ctx context.Context) (api.PingRes, error) {
	return new(api.PingOKApplicationJSON("pong")), nil
}

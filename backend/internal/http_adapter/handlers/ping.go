package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
)

func (h *Handler) Ping(ctx context.Context) (api.PingRes, error) {
	return new(api.PingOKApplicationJSON("pong")), nil
}

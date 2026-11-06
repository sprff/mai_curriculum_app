package handlers

import (
	"backend/internal/auth"
	api "backend/internal/http_adapter/router/generated"
	"context"
	"errors"
)

func (h *Handler) HandleBearerAuth(ctx context.Context, _ api.OperationName, token api.BearerAuth) (context.Context, error) {
	if h.service == nil {
		return ctx, auth.ErrUnauthorized
	}
	user, err := h.service.Authorize(ctx, token.Token)
	if err != nil {
		if errors.Is(err, auth.ErrUnauthorized) {
			return ctx, err
		}
		return ctx, errors.Join(auth.ErrUnavailable, err)
	}
	return auth.WithUser(ctx, user), nil
}

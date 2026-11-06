package handlers

import "context"

func (h *Handler) Ping(_ context.Context) (string, error) {
	return "pong", nil
}

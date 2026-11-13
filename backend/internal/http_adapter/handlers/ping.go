package handlers

import (
	"context"

	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) Ping(_ context.Context) (string, error) {
	return "", ht.ErrNotImplemented
}

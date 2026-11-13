package handlers

import api "backend/internal/http_adapter/router/generated"

type Handler struct{}

var _ api.Handler = (*Handler)(nil)
var _ api.SecurityHandler = (*Handler)(nil)

func New() *Handler {
	return &Handler{}
}

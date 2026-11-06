package handlers

import (
	"backend/internal/auth"
	api "backend/internal/http_adapter/router/generated"
)

// Unimplemented operations remain explicit until refresh-session storage is agreed.
type Handler struct {
	api.UnimplementedHandler
	service *auth.Service
}

var _ api.Handler = (*Handler)(nil)
var _ api.SecurityHandler = (*Handler)(nil)

func New(services ...*auth.Service) *Handler {
	h := &Handler{}
	if len(services) > 0 {
		h.service = services[0]
	}
	return h
}

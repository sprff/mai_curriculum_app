package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) CreateGroup(ctx context.Context, req *api.GroupInput) (api.CreateGroupRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteGroup(ctx context.Context, params api.DeleteGroupParams) (api.DeleteGroupRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) GetGroup(ctx context.Context, params api.GetGroupParams) (api.GetGroupRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) ListGroups(ctx context.Context, params api.ListGroupsParams) (api.ListGroupsRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) UpdateGroup(ctx context.Context, req *api.GroupInput, params api.UpdateGroupParams) (api.UpdateGroupRes, error) {
	return nil, ht.ErrNotImplemented
}

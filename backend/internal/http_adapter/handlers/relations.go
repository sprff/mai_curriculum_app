package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) CreateGroupSubjectRelation(ctx context.Context, params api.CreateGroupSubjectRelationParams) (api.CreateGroupSubjectRelationRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) CreateTeacherSubjectRelation(ctx context.Context, params api.CreateTeacherSubjectRelationParams) (api.CreateTeacherSubjectRelationRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteGroupSubjectRelation(ctx context.Context, params api.DeleteGroupSubjectRelationParams) (api.DeleteGroupSubjectRelationRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteTeacherSubjectRelation(ctx context.Context, params api.DeleteTeacherSubjectRelationParams) (api.DeleteTeacherSubjectRelationRes, error) {
	return nil, ht.ErrNotImplemented
}

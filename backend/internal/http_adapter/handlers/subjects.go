package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) CreateSubject(ctx context.Context, req *api.SubjectInput) (api.CreateSubjectRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteSubject(ctx context.Context, params api.DeleteSubjectParams) (api.DeleteSubjectRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) GetSubject(ctx context.Context, params api.GetSubjectParams) (api.GetSubjectRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) ListSubjects(ctx context.Context, params api.ListSubjectsParams) (api.ListSubjectsRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) UpdateSubject(ctx context.Context, req *api.SubjectInput, params api.UpdateSubjectParams) (api.UpdateSubjectRes, error) {
	return nil, ht.ErrNotImplemented
}

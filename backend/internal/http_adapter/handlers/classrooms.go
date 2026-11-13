package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	ht "github.com/ogen-go/ogen/http"
)

func (h *Handler) CreateClassroom(ctx context.Context, req *api.ClassroomInput) (api.CreateClassroomRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) DeleteClassroom(ctx context.Context, params api.DeleteClassroomParams) (api.DeleteClassroomRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) GetClassroom(ctx context.Context, params api.GetClassroomParams) (api.GetClassroomRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) ListClassrooms(ctx context.Context, params api.ListClassroomsParams) (api.ListClassroomsRes, error) {
	return nil, ht.ErrNotImplemented
}

func (h *Handler) UpdateClassroom(ctx context.Context, req *api.ClassroomInput, params api.UpdateClassroomParams) (api.UpdateClassroomRes, error) {
	return nil, ht.ErrNotImplemented
}

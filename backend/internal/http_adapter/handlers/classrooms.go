package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	"backend/internal/model"
)

func (h *Handler) CreateClassroom(ctx context.Context, req *api.ClassroomInput) (api.CreateClassroomRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Classroom.CreateClassroom(ctx, model.Classroom{Capacity: int(req.Capacity), RoomNumber: req.RoomNumber})
	if err != nil {
		return nil, err
	}
	result := classroomResponse(value)
	return &result, nil
}

func (h *Handler) DeleteClassroom(ctx context.Context, params api.DeleteClassroomParams) (api.DeleteClassroomRes, error) {
	if err := h.services.Classroom.DeleteClassroom(ctx, int64(params.ID)); err != nil {
		return nil, err
	}
	return &api.DeleteClassroomNoContent{}, nil
}

func (h *Handler) GetClassroom(ctx context.Context, params api.GetClassroomParams) (api.GetClassroomRes, error) {
	value, err := h.services.Classroom.GetClassroom(ctx, int64(params.ID))
	if err != nil {
		return nil, err
	}
	result := classroomResponse(value)
	return &result, nil
}

func (h *Handler) ListClassrooms(ctx context.Context, params api.ListClassroomsParams) (api.ListClassroomsRes, error) {
	values, err := h.services.Classroom.ListClassrooms(ctx, params.Page.Or(1), params.PerPage.Or(50))
	if err != nil {
		return nil, err
	}
	result := make(api.ListClassroomsOKApplicationJSON, 0, len(values))
	for _, value := range values {
		result = append(result, classroomResponse(value))
	}
	return &result, nil
}

func (h *Handler) UpdateClassroom(ctx context.Context, req *api.ClassroomInput, params api.UpdateClassroomParams) (api.UpdateClassroomRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Classroom.UpdateClassroom(ctx, int64(params.ID), model.Classroom{Capacity: int(req.Capacity), RoomNumber: req.RoomNumber})
	if err != nil {
		return nil, err
	}
	result := classroomResponse(value)
	return &result, nil
}

func classroomResponse(value model.Classroom) api.Classroom {
	return api.Classroom{ID: api.EntityId(value.ID), Capacity: int32(value.Capacity), RoomNumber: value.RoomNumber}
}

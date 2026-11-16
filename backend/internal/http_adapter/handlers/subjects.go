package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	"backend/internal/model"
)

func (h *Handler) CreateSubject(ctx context.Context, req *api.SubjectInput) (api.CreateSubjectRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Subject.CreateSubject(ctx, model.Subject{Name: req.Name, WeeklyNumberOfLessons: int(req.WeeklyNumberOfLessons)})
	if err != nil {
		return nil, err
	}
	result := subjectResponse(value)
	return &result, nil
}

func (h *Handler) DeleteSubject(ctx context.Context, params api.DeleteSubjectParams) (api.DeleteSubjectRes, error) {
	if err := h.services.Subject.DeleteSubject(ctx, int64(params.ID)); err != nil {
		return nil, err
	}
	return &api.DeleteSubjectNoContent{}, nil
}

func (h *Handler) GetSubject(ctx context.Context, params api.GetSubjectParams) (api.GetSubjectRes, error) {
	value, err := h.services.Subject.GetSubject(ctx, int64(params.ID))
	if err != nil {
		return nil, err
	}
	result := subjectResponse(value)
	return &result, nil
}

func (h *Handler) ListSubjects(ctx context.Context, params api.ListSubjectsParams) (api.ListSubjectsRes, error) {
	values, err := h.services.Subject.ListSubjects(ctx, params.Page.Or(1), params.PerPage.Or(50))
	if err != nil {
		return nil, err
	}
	result := make(api.ListSubjectsOKApplicationJSON, 0, len(values))
	for _, value := range values {
		result = append(result, subjectResponse(value))
	}
	return &result, nil
}

func (h *Handler) UpdateSubject(ctx context.Context, req *api.SubjectInput, params api.UpdateSubjectParams) (api.UpdateSubjectRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Subject.UpdateSubject(ctx, int64(params.ID), model.Subject{Name: req.Name, WeeklyNumberOfLessons: int(req.WeeklyNumberOfLessons)})
	if err != nil {
		return nil, err
	}
	result := subjectResponse(value)
	return &result, nil
}

func subjectResponse(value model.Subject) api.Subject {
	return api.Subject{ID: api.EntityId(value.ID), Name: value.Name, WeeklyNumberOfLessons: int32(value.WeeklyNumberOfLessons)}
}

func (h *Handler) CreateTeacherSubjectRelation(ctx context.Context, params api.CreateTeacherSubjectRelationParams) (api.CreateTeacherSubjectRelationRes, error) {
	if err := h.services.Subject.CreateTeacherSubjectRelation(ctx, int64(params.TeacherID), int64(params.SubjectID)); err != nil {
		return nil, err
	}
	return &api.CreateTeacherSubjectRelationOK{}, nil
}

func (h *Handler) DeleteTeacherSubjectRelation(ctx context.Context, params api.DeleteTeacherSubjectRelationParams) (api.DeleteTeacherSubjectRelationRes, error) {
	if err := h.services.Subject.DeleteTeacherSubjectRelation(ctx, int64(params.TeacherID), int64(params.SubjectID)); err != nil {
		return nil, err
	}
	return &api.DeleteTeacherSubjectRelationNoContent{}, nil
}

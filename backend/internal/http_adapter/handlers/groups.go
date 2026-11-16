package handlers

import (
	"context"

	api "backend/internal/http_adapter/router/generated"
	"backend/internal/model"
)

func (h *Handler) CreateGroup(ctx context.Context, req *api.GroupInput) (api.CreateGroupRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Group.CreateGroup(ctx, model.Group{GroupName: req.GroupName})
	if err != nil {
		return nil, err
	}
	result := groupResponse(value)
	return &result, nil
}

func (h *Handler) DeleteGroup(ctx context.Context, params api.DeleteGroupParams) (api.DeleteGroupRes, error) {
	if err := h.services.Group.DeleteGroup(ctx, int64(params.ID)); err != nil {
		return nil, err
	}
	return &api.DeleteGroupNoContent{}, nil
}

func (h *Handler) GetGroup(ctx context.Context, params api.GetGroupParams) (api.GetGroupRes, error) {
	value, err := h.services.Group.GetGroup(ctx, int64(params.ID))
	if err != nil {
		return nil, err
	}
	result := groupResponse(value)
	return &result, nil
}

func (h *Handler) ListGroups(ctx context.Context, params api.ListGroupsParams) (api.ListGroupsRes, error) {
	values, err := h.services.Group.ListGroups(ctx, params.Page.Or(1), params.PerPage.Or(50))
	if err != nil {
		return nil, err
	}
	result := make(api.ListGroupsOKApplicationJSON, 0, len(values))
	for _, value := range values {
		result = append(result, groupResponse(value))
	}
	return &result, nil
}

func (h *Handler) UpdateGroup(ctx context.Context, req *api.GroupInput, params api.UpdateGroupParams) (api.UpdateGroupRes, error) {
	if req == nil {
		return nil, model.ErrInvalidInput
	}
	value, err := h.services.Group.UpdateGroup(ctx, int64(params.ID), model.Group{GroupName: req.GroupName})
	if err != nil {
		return nil, err
	}
	result := groupResponse(value)
	return &result, nil
}

func groupResponse(value model.Group) api.Group {
	return api.Group{ID: api.EntityId(value.ID), GroupName: value.GroupName}
}

func (h *Handler) CreateGroupSubjectRelation(ctx context.Context, params api.CreateGroupSubjectRelationParams) (api.CreateGroupSubjectRelationRes, error) {
	if err := h.services.Group.CreateGroupSubjectRelation(ctx, int64(params.GroupID), int64(params.SubjectID)); err != nil {
		return nil, err
	}
	return &api.CreateGroupSubjectRelationOK{}, nil
}

func (h *Handler) DeleteGroupSubjectRelation(ctx context.Context, params api.DeleteGroupSubjectRelationParams) (api.DeleteGroupSubjectRelationRes, error) {
	if err := h.services.Group.DeleteGroupSubjectRelation(ctx, int64(params.GroupID), int64(params.SubjectID)); err != nil {
		return nil, err
	}
	return &api.DeleteGroupSubjectRelationNoContent{}, nil
}

package service

import (
	"context"
	"strings"

	"backend/internal/model"
	"backend/internal/repository"
)

type Group interface {
	CreateGroup(context.Context, model.Group) (model.Group, error)
	GetGroup(context.Context, int64) (model.Group, error)
	ListGroups(context.Context, int, int) ([]model.Group, error)
	UpdateGroup(context.Context, int64, model.Group) (model.Group, error)
	DeleteGroup(context.Context, int64) error
	CreateGroupSubjectRelation(context.Context, int64, int64) error
	DeleteGroupSubjectRelation(context.Context, int64, int64) error
}

type GroupService struct {
	repo repository.Group
}

var _ Group = (*GroupService)(nil)

func NewGroupService(repo repository.Group) *GroupService {
	return &GroupService{repo: repo}
}

func (s *GroupService) CreateGroup(ctx context.Context, value model.Group) (model.Group, error) {
	value, err := normalizeGroup(value)
	if err != nil {
		return model.Group{}, err
	}
	return s.repo.CreateGroup(ctx, value)
}

func (s *GroupService) GetGroup(ctx context.Context, id int64) (model.Group, error) {
	if err := validateIDs(id); err != nil {
		return model.Group{}, err
	}
	return s.repo.GetGroup(ctx, id)
}

func (s *GroupService) ListGroups(ctx context.Context, page, perPage int) ([]model.Group, error) {
	limit, offset, err := pagination(page, perPage)
	if err != nil {
		return nil, err
	}
	return s.repo.ListGroups(ctx, limit, offset)
}

func (s *GroupService) UpdateGroup(ctx context.Context, id int64, value model.Group) (model.Group, error) {
	if err := validateIDs(id); err != nil {
		return model.Group{}, err
	}
	value, err := normalizeGroup(value)
	if err != nil {
		return model.Group{}, err
	}
	return s.repo.UpdateGroup(ctx, id, value)
}

func (s *GroupService) DeleteGroup(ctx context.Context, id int64) error {
	if err := validateIDs(id); err != nil {
		return err
	}
	return s.repo.DeleteGroup(ctx, id)
}

func (s *GroupService) CreateGroupSubjectRelation(ctx context.Context, id, subjectID int64) error {
	if err := validateIDs(id, subjectID); err != nil {
		return err
	}
	return s.repo.CreateGroupSubjectRelation(ctx, id, subjectID)
}

func (s *GroupService) DeleteGroupSubjectRelation(ctx context.Context, id, subjectID int64) error {
	if err := validateIDs(id, subjectID); err != nil {
		return err
	}
	return s.repo.DeleteGroupSubjectRelation(ctx, id, subjectID)
}

func normalizeGroup(value model.Group) (model.Group, error) {
	value.GroupName = strings.TrimSpace(value.GroupName)
	return value, validateText(value.GroupName, "group_name")
}

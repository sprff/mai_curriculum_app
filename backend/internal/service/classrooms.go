package service

import (
	"context"
	"math"
	"strings"

	"backend/internal/model"
	"backend/internal/repository"
)

type Classroom interface {
	CreateClassroom(context.Context, model.Classroom) (model.Classroom, error)
	GetClassroom(context.Context, int64) (model.Classroom, error)
	ListClassrooms(context.Context, int, int) ([]model.Classroom, error)
	UpdateClassroom(context.Context, int64, model.Classroom) (model.Classroom, error)
	DeleteClassroom(context.Context, int64) error
}

type ClassroomService struct {
	repo repository.Classroom
}

var _ Classroom = (*ClassroomService)(nil)

func NewClassroomService(repo repository.Classroom) *ClassroomService {
	return &ClassroomService{repo: repo}
}

func (s *ClassroomService) CreateClassroom(ctx context.Context, value model.Classroom) (model.Classroom, error) {
	value, err := normalizeClassroom(value)
	if err != nil {
		return model.Classroom{}, err
	}
	return s.repo.CreateClassroom(ctx, value)
}

func (s *ClassroomService) GetClassroom(ctx context.Context, id int64) (model.Classroom, error) {
	if err := validateIDs(id); err != nil {
		return model.Classroom{}, err
	}
	return s.repo.GetClassroom(ctx, id)
}

func (s *ClassroomService) ListClassrooms(ctx context.Context, page, perPage int) ([]model.Classroom, error) {
	limit, offset, err := pagination(page, perPage)
	if err != nil {
		return nil, err
	}
	return s.repo.ListClassrooms(ctx, limit, offset)
}

func (s *ClassroomService) UpdateClassroom(ctx context.Context, id int64, value model.Classroom) (model.Classroom, error) {
	if err := validateIDs(id); err != nil {
		return model.Classroom{}, err
	}
	value, err := normalizeClassroom(value)
	if err != nil {
		return model.Classroom{}, err
	}
	return s.repo.UpdateClassroom(ctx, id, value)
}

func (s *ClassroomService) DeleteClassroom(ctx context.Context, id int64) error {
	if err := validateIDs(id); err != nil {
		return err
	}
	return s.repo.DeleteClassroom(ctx, id)
}

func normalizeClassroom(value model.Classroom) (model.Classroom, error) {
	value.RoomNumber = strings.TrimSpace(value.RoomNumber)
	if err := validateText(value.RoomNumber, "room_number"); err != nil {
		return value, err
	}
	if value.Capacity < 1 || int64(value.Capacity) > math.MaxInt32 {
		return value, invalidInput("capacity must be a positive int32")
	}
	return value, nil
}

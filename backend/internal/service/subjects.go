package service

import (
	"context"
	"math"
	"strings"

	"backend/internal/model"
	"backend/internal/repository"
)

type Subject interface {
	CreateSubject(context.Context, model.Subject) (model.Subject, error)
	GetSubject(context.Context, int64) (model.Subject, error)
	ListSubjects(context.Context, int, int) ([]model.Subject, error)
	UpdateSubject(context.Context, int64, model.Subject) (model.Subject, error)
	DeleteSubject(context.Context, int64) error
	CreateTeacherSubjectRelation(context.Context, int64, int64) error
	DeleteTeacherSubjectRelation(context.Context, int64, int64) error
}

type SubjectService struct {
	repo repository.Subject
}

var _ Subject = (*SubjectService)(nil)

func NewSubjectService(repo repository.Subject) *SubjectService {
	return &SubjectService{repo: repo}
}

func (s *SubjectService) CreateSubject(ctx context.Context, value model.Subject) (model.Subject, error) {
	value, err := normalizeSubject(value)
	if err != nil {
		return model.Subject{}, err
	}
	return s.repo.CreateSubject(ctx, value)
}

func (s *SubjectService) GetSubject(ctx context.Context, id int64) (model.Subject, error) {
	if err := validateIDs(id); err != nil {
		return model.Subject{}, err
	}
	return s.repo.GetSubject(ctx, id)
}

func (s *SubjectService) ListSubjects(ctx context.Context, page, perPage int) ([]model.Subject, error) {
	limit, offset, err := pagination(page, perPage)
	if err != nil {
		return nil, err
	}
	return s.repo.ListSubjects(ctx, limit, offset)
}

func (s *SubjectService) UpdateSubject(ctx context.Context, id int64, value model.Subject) (model.Subject, error) {
	if err := validateIDs(id); err != nil {
		return model.Subject{}, err
	}
	value, err := normalizeSubject(value)
	if err != nil {
		return model.Subject{}, err
	}
	return s.repo.UpdateSubject(ctx, id, value)
}

func (s *SubjectService) DeleteSubject(ctx context.Context, id int64) error {
	if err := validateIDs(id); err != nil {
		return err
	}
	return s.repo.DeleteSubject(ctx, id)
}

func (s *SubjectService) CreateTeacherSubjectRelation(ctx context.Context, id, subjectID int64) error {
	if err := validateIDs(id, subjectID); err != nil {
		return err
	}
	return s.repo.CreateTeacherSubjectRelation(ctx, id, subjectID)
}

func (s *SubjectService) DeleteTeacherSubjectRelation(ctx context.Context, id, subjectID int64) error {
	if err := validateIDs(id, subjectID); err != nil {
		return err
	}
	return s.repo.DeleteTeacherSubjectRelation(ctx, id, subjectID)
}

func normalizeSubject(value model.Subject) (model.Subject, error) {
	value.Name = strings.TrimSpace(value.Name)
	if err := validateText(value.Name, "name"); err != nil {
		return value, err
	}
	if value.WeeklyNumberOfLessons < 1 || int64(value.WeeklyNumberOfLessons) > math.MaxInt32 {
		return value, invalidInput("weekly_number_of_lessons must be a positive int32")
	}
	return value, nil
}

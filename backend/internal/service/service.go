package service

import (
	"context"

	"backend/internal/model"
	"backend/internal/repository"
)

type Generation interface {
	GetGenerationRequest(ctx context.Context) (model.GenerationRequest, error)
}

type Service struct {
	Generation
	Classroom
	Subject
	Group
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		Generation: NewGenerationService(repo),
		Classroom:  NewClassroomService(repo.Classroom),
		Subject:    NewSubjectService(repo.Subject),
		Group:      NewGroupService(repo.Group),
	}
}

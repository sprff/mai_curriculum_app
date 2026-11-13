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
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		Generation: NewGenerationService(repo),
	}
}

package service

import (
	"context"

	"backend/internal/model"
	"backend/internal/repository"
)

type GenerationService struct {
	repo repository.Generation
}

func NewGenerationService(repo repository.Generation) *GenerationService {
	return &GenerationService{repo: repo}
}

func (s *GenerationService) GetGenerationRequest(ctx context.Context) (model.GenerationRequest, error) {
	return s.repo.GetGenerationRequest(ctx)
}

package repository

import (
	"backend/internal/model"
	"context"
	"database/sql"

	_ "github.com/lib/pq"
)

type GenerationPostgres struct {
	db *sql.DB
}

type Generation interface {
	GetGenerationRequest(context.Context) (model.GenerationRequest, error)
}

type Repository struct{ Generation }

func NewRepository(db *sql.DB) *Repository {
	return &Repository{Generation: &GenerationPostgres{db: db}}
}

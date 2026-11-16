package repository

import (
	"context"
	"database/sql"

	"backend/internal/model"
)

type GenerationPostgres struct {
	db *sql.DB
}

type Generation interface {
	GetGenerationRequest(context.Context) (model.GenerationRequest, error)
}

type Repository struct {
	Generation
	Classroom
	Subject
	Group
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		Generation: &GenerationPostgres{db: db},
		Classroom:  &ClassroomPostgres{db: db},
		Subject:    &SubjectPostgres{db: db},
		Group:      &GroupPostgres{db: db},
	}
}

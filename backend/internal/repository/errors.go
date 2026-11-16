package repository

import (
	"database/sql"
	"errors"

	"backend/internal/model"

	"github.com/lib/pq"
)

// Map database errors to domain errors without exposing SQL or constraint details.
func databaseError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return model.ErrNotFound
	}
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505", "23503": // Duplicate key or a resource still referenced by another row.
			return model.ErrConflict
		case "23514", "22001", "22003": // Check constraint, string length, numeric range.
			return model.ErrInvalidInput
		}
	}
	return err
}

func affectedRow(result sql.Result, err error) error {
	if err != nil {
		return databaseError(err)
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return model.ErrNotFound
	}
	return nil
}

// A foreign key failure during insertion means one of the relation endpoints is missing.
func relationError(err error) error {
	var pgErr *pq.Error
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return model.ErrNotFound
	}
	return databaseError(err)
}

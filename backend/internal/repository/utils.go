package repository

import (
	"context"
	"database/sql"
)

func queryRows[T any](
	ctx context.Context,
	tx *sql.Tx,
	query string,
	scan func(*sql.Rows, *T) error,
) ([]T, error) {
	rows, err := tx.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]T, 0)
	for rows.Next() {
		var value T
		if err := scan(rows, &value); err != nil {
			return nil, err
		}

		result = append(result, value)
	}

	return result, rows.Err()
}

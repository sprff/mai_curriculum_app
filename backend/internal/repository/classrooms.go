package repository

import (
	"context"
	"database/sql"

	"backend/internal/model"
)

type Classroom interface {
	CreateClassroom(context.Context, model.Classroom) (model.Classroom, error)
	GetClassroom(context.Context, int64) (model.Classroom, error)
	ListClassrooms(context.Context, int64, int64) ([]model.Classroom, error)
	UpdateClassroom(context.Context, int64, model.Classroom) (model.Classroom, error)
	DeleteClassroom(context.Context, int64) error
}

type ClassroomPostgres struct {
	db *sql.DB
}

var _ Classroom = (*ClassroomPostgres)(nil)

func (r *ClassroomPostgres) CreateClassroom(ctx context.Context, value model.Classroom) (model.Classroom, error) {
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO public.classrooms (capacity, room_number) VALUES ($1, $2) RETURNING id, capacity, room_number`,
		value.Capacity, value.RoomNumber,
	).Scan(&value.ID, &value.Capacity, &value.RoomNumber)
	return value, databaseError(err)
}

func (r *ClassroomPostgres) GetClassroom(ctx context.Context, id int64) (model.Classroom, error) {
	var value model.Classroom
	err := r.db.QueryRowContext(ctx,
		`SELECT id, capacity, room_number FROM public.classrooms WHERE id = $1`, id,
	).Scan(&value.ID, &value.Capacity, &value.RoomNumber)
	return value, databaseError(err)
}

func (r *ClassroomPostgres) ListClassrooms(ctx context.Context, limit, offset int64) ([]model.Classroom, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, capacity, room_number FROM public.classrooms ORDER BY id LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	result := make([]model.Classroom, 0)
	for rows.Next() {
		var value model.Classroom
		if err := rows.Scan(&value.ID, &value.Capacity, &value.RoomNumber); err != nil {
			return nil, err
		}
		result = append(result, value)
	}
	return result, rows.Err()
}

func (r *ClassroomPostgres) UpdateClassroom(ctx context.Context, id int64, value model.Classroom) (model.Classroom, error) {
	err := r.db.QueryRowContext(ctx,
		`UPDATE public.classrooms SET capacity = $2, room_number = $3 WHERE id = $1 RETURNING id, capacity, room_number`,
		id, value.Capacity, value.RoomNumber,
	).Scan(&value.ID, &value.Capacity, &value.RoomNumber)
	return value, databaseError(err)
}

func (r *ClassroomPostgres) DeleteClassroom(ctx context.Context, id int64) error {
	return affectedRow(r.db.ExecContext(ctx, `DELETE FROM public.classrooms WHERE id = $1`, id))
}

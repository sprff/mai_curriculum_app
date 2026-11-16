package repository

import (
	"context"
	"database/sql"

	"backend/internal/model"
)

type Subject interface {
	CreateSubject(context.Context, model.Subject) (model.Subject, error)
	GetSubject(context.Context, int64) (model.Subject, error)
	ListSubjects(context.Context, int64, int64) ([]model.Subject, error)
	UpdateSubject(context.Context, int64, model.Subject) (model.Subject, error)
	DeleteSubject(context.Context, int64) error
	CreateTeacherSubjectRelation(context.Context, int64, int64) error
	DeleteTeacherSubjectRelation(context.Context, int64, int64) error
}

type SubjectPostgres struct {
	db *sql.DB
}

var _ Subject = (*SubjectPostgres)(nil)

func (r *SubjectPostgres) CreateSubject(ctx context.Context, value model.Subject) (model.Subject, error) {
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO public.subjects (name, weekly_number_of_lessons) VALUES ($1, $2) RETURNING id, name, weekly_number_of_lessons`,
		value.Name, value.WeeklyNumberOfLessons,
	).Scan(&value.ID, &value.Name, &value.WeeklyNumberOfLessons)
	return value, databaseError(err)
}

func (r *SubjectPostgres) GetSubject(ctx context.Context, id int64) (model.Subject, error) {
	var value model.Subject
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, weekly_number_of_lessons FROM public.subjects WHERE id = $1`, id,
	).Scan(&value.ID, &value.Name, &value.WeeklyNumberOfLessons)
	return value, databaseError(err)
}

func (r *SubjectPostgres) ListSubjects(ctx context.Context, limit, offset int64) ([]model.Subject, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, weekly_number_of_lessons FROM public.subjects ORDER BY id LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	result := make([]model.Subject, 0)
	for rows.Next() {
		var value model.Subject
		if err := rows.Scan(&value.ID, &value.Name, &value.WeeklyNumberOfLessons); err != nil {
			return nil, err
		}
		result = append(result, value)
	}
	return result, rows.Err()
}

func (r *SubjectPostgres) UpdateSubject(ctx context.Context, id int64, value model.Subject) (model.Subject, error) {
	err := r.db.QueryRowContext(ctx,
		`UPDATE public.subjects SET name = $2, weekly_number_of_lessons = $3 WHERE id = $1 RETURNING id, name, weekly_number_of_lessons`,
		id, value.Name, value.WeeklyNumberOfLessons,
	).Scan(&value.ID, &value.Name, &value.WeeklyNumberOfLessons)
	return value, databaseError(err)
}

func (r *SubjectPostgres) DeleteSubject(ctx context.Context, id int64) error {
	return affectedRow(r.db.ExecContext(ctx, `DELETE FROM public.subjects WHERE id = $1`, id))
}

func (r *SubjectPostgres) CreateTeacherSubjectRelation(ctx context.Context, teacherID, subjectID int64) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)`, teacherID, subjectID,
	)
	return relationError(err)
}

func (r *SubjectPostgres) DeleteTeacherSubjectRelation(ctx context.Context, teacherID, subjectID int64) error {
	return affectedRow(r.db.ExecContext(ctx,
		`DELETE FROM public.teacher_subjects WHERE teacher_id = $1 AND subject_id = $2`, teacherID, subjectID,
	))
}

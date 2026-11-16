package repository

import (
	"context"
	"database/sql"

	"backend/internal/model"
)

type Group interface {
	CreateGroup(context.Context, model.Group) (model.Group, error)
	GetGroup(context.Context, int64) (model.Group, error)
	ListGroups(context.Context, int64, int64) ([]model.Group, error)
	UpdateGroup(context.Context, int64, model.Group) (model.Group, error)
	DeleteGroup(context.Context, int64) error
	CreateGroupSubjectRelation(context.Context, int64, int64) error
	DeleteGroupSubjectRelation(context.Context, int64, int64) error
}

type GroupPostgres struct {
	db *sql.DB
}

var _ Group = (*GroupPostgres)(nil)

func (r *GroupPostgres) CreateGroup(ctx context.Context, value model.Group) (model.Group, error) {
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO public.groups (group_name) VALUES ($1) RETURNING id, group_name`,
		value.GroupName,
	).Scan(&value.ID, &value.GroupName)
	return value, databaseError(err)
}

func (r *GroupPostgres) GetGroup(ctx context.Context, id int64) (model.Group, error) {
	var value model.Group
	err := r.db.QueryRowContext(ctx,
		`SELECT id, group_name FROM public.groups WHERE id = $1`, id,
	).Scan(&value.ID, &value.GroupName)
	return value, databaseError(err)
}

func (r *GroupPostgres) ListGroups(ctx context.Context, limit, offset int64) ([]model.Group, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, group_name FROM public.groups ORDER BY id LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	result := make([]model.Group, 0)
	for rows.Next() {
		var value model.Group
		if err := rows.Scan(&value.ID, &value.GroupName); err != nil {
			return nil, err
		}
		result = append(result, value)
	}
	return result, rows.Err()
}

func (r *GroupPostgres) UpdateGroup(ctx context.Context, id int64, value model.Group) (model.Group, error) {
	err := r.db.QueryRowContext(ctx,
		`UPDATE public.groups SET group_name = $2 WHERE id = $1 RETURNING id, group_name`,
		id, value.GroupName,
	).Scan(&value.ID, &value.GroupName)
	return value, databaseError(err)
}

func (r *GroupPostgres) DeleteGroup(ctx context.Context, id int64) error {
	return affectedRow(r.db.ExecContext(ctx, `DELETE FROM public.groups WHERE id = $1`, id))
}

func (r *GroupPostgres) CreateGroupSubjectRelation(ctx context.Context, groupID, subjectID int64) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO public.group_subjects (group_id, subject_id) VALUES ($1, $2)`, groupID, subjectID,
	)
	return relationError(err)
}

func (r *GroupPostgres) DeleteGroupSubjectRelation(ctx context.Context, groupID, subjectID int64) error {
	return affectedRow(r.db.ExecContext(ctx,
		`DELETE FROM public.group_subjects WHERE group_id = $1 AND subject_id = $2`, groupID, subjectID,
	))
}

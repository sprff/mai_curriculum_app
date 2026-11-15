package repository

import (
	"context"
	"database/sql"
	"fmt"

	"backend/internal/model"
)

func (r *GenerationPostgres) GetGenerationRequest(ctx context.Context) (model.GenerationRequest, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelRepeatableRead,
		ReadOnly:  true,
	})
	if err != nil {
		return model.GenerationRequest{}, fmt.Errorf("error beginning transaction: %w", err)
	}
	defer tx.Rollback()

	request := model.GenerationRequest{
		Classrooms:      []model.GeneratorClassroom{},
		Subjects:        []model.GeneratorSubject{},
		Groups:          []model.GeneratorGroup{},
		TeacherSubjects: []model.GeneratorTeacherSubject{},
		GroupSubjects:   []model.GeneratorGroupSubject{},
	}

	request.Classrooms, err = queryRows(
		ctx,
		tx,
		`
			SELECT id, capacity
			FROM public.classrooms
			ORDER BY id
		`,
		func(rows *sql.Rows, classroom *model.GeneratorClassroom) error {
			return rows.Scan(&classroom.IDNumber, &classroom.Capacity)
		},
	)
	if err != nil {
		return request, fmt.Errorf("error loading classrooms: %w", err)
	}

	request.Subjects, err = queryRows(
		ctx,
		tx,
		`
			SELECT id, weekly_number_of_lessons
			FROM public.subjects
			ORDER BY id
		`,
		func(rows *sql.Rows, subject *model.GeneratorSubject) error {
			return rows.Scan(&subject.ID, &subject.WeeklyNumberOfLessons)
		},
	)
	if err != nil {
		return request, fmt.Errorf("error loading subjects: %w", err)
	}

	request.Groups, err = queryRows(
		ctx,
		tx,
		`
			SELECT g.id, COUNT(u.id)
			FROM public.groups AS g
			LEFT JOIN public.users AS u
				ON u.group_id = g.id AND u.role = 'student'
			GROUP BY g.id
			ORDER BY g.id
		`,
		func(rows *sql.Rows, group *model.GeneratorGroup) error {
			return rows.Scan(&group.ID, &group.Size)
		},
	)
	if err != nil {
		return request, fmt.Errorf("error loading groups: %w", err)
	}

	request.TeacherSubjects, err = queryRows(
		ctx,
		tx,
		`
			SELECT teacher_id, subject_id
			FROM public.teacher_subjects
			ORDER BY teacher_id, subject_id
		`,
		func(rows *sql.Rows, teacherSubject *model.GeneratorTeacherSubject) error {
			return rows.Scan(&teacherSubject.TeacherID, &teacherSubject.SubjectID)
		},
	)
	if err != nil {
		return request, fmt.Errorf("error loading teacher subjects: %w", err)
	}

	request.GroupSubjects, err = queryRows(
		ctx,
		tx,
		`
			SELECT group_id, subject_id
			FROM public.group_subjects
			ORDER BY group_id, subject_id
		`,
		func(rows *sql.Rows, groupSubject *model.GeneratorGroupSubject) error {
			return rows.Scan(&groupSubject.GroupID, &groupSubject.SubjectID)
		},
	)
	if err != nil {
		return request, fmt.Errorf("error loading group subjects: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return request, fmt.Errorf("error commiting transaction: %w", err)
	}

	return request, nil
}

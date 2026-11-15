package model

import "time"

type GenerationRequest struct {
	Classrooms      []GeneratorClassroom      `json:"classrooms"`
	Subjects        []GeneratorSubject        `json:"subjects"`
	Groups          []GeneratorGroup          `json:"groups"`
	TeacherSubjects []GeneratorTeacherSubject `json:"teacher_subjects"`
	GroupSubjects   []GeneratorGroupSubject   `json:"group_subjects"`
}

type GeneratorClassroom struct {
	IDNumber int `json:"id_number"`
	Capacity int `json:"capacity"`
}

type GeneratorSubject struct {
	ID                    int `json:"id"`
	WeeklyNumberOfLessons int `json:"weekly_number_of_lessons"`
}

type GeneratorGroup struct {
	ID   int `json:"id"`
	Size int `json:"size"`
}

type GeneratorTeacherSubject struct {
	TeacherID int `json:"teacher_id"`
	SubjectID int `json:"subject_id"`
}

type GeneratorGroupSubject struct {
	GroupID   int `json:"group_id"`
	SubjectID int `json:"subject_id"`
}

type GenerationLesson struct {
	Day          int `json:"day"`
	LessonNumber int `json:"lesson_number"`
	GroupID      int `json:"group_id"`
	SubjectID    int `json:"subject_id"`
	TeacherID    int `json:"teacher_id"`
	ClassroomID  int `json:"classroom_id"`
}

type GenerationJobCreated struct {
	JobID string `json:"job_id"`
}

type GenerationJob struct {
	ID              string             `json:"id"`
	Status          string             `json:"status"`
	CreatedAt       time.Time          `json:"created_at"`
	StartedAt       *time.Time         `json:"started_at"`
	FinishedAt      *time.Time         `json:"finished_at"`
	ProgressPlaced  int                `json:"progress_placed"`
	ProgressTotal   int                `json:"progress_total"`
	Error           *string            `json:"error"`
	Result          []GenerationLesson `json:"result"`
	CancelRequested bool               `json:"cancel_requested"`
}

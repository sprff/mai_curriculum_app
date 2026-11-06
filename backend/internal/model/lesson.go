package model

import "time"

type Lesson struct {
	ID           int       `json:"id"            db:"id"`
	Date         time.Time `json:"date"          db:"date"`
	LessonNumber int       `json:"lesson_number" db:"lesson_number"`
	GroupID      int       `json:"group_id"      db:"group_id"`
	TeacherID    int       `json:"teacher_id"    db:"teacher_id"`
	ClassroomID  int       `json:"classroom_id"  db:"classroom_id"`
	LessonType   string    `json:"lesson_type"   db:"lesson_type"`
	SubjectID    int       `json:"subject_id"    db:"subject_id"`
}

type LessonVersion struct {
	ID           int       `json:"id"            db:"id"`
	Name         string    `json:"name"          db:"name"`
	CreationTime time.Time `json:"creation_time" db:"creation_time"`
	Status       string    `json:"status"        db:"status"`
}

type LessonVersionItem struct {
	LessonID  int `json:"lesson_id"  db:"lesson_id"`
	VersionID int `json:"version_id" db:"version_id"`
}

type PublishedScheduleVersion struct {
	ID                int `json:"id"                  db:"id"`
	LessonsVersionsID int `json:"lessons_versions_id" db:"lessons_versions_id"`
}

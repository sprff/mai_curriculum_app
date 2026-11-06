package model

type Teacher struct {
	ID     int    `json:"id"                db:"id"`
	Name   string `json:"name"              db:"name"`
	UserID *int   `json:"user_id,omitempty" db:"user_id"`
}

type TeacherSubject struct {
	TeacherID int `json:"teacher_id" db:"teacher_id"`
	SubjectID int `json:"subject_id" db:"subject_id"`
}

type TeacherPreference struct {
	ID               int `json:"id"                db:"id"`
	TeacherID        int `json:"teacher_id"        db:"teacher_id"`
	DayOfWeek        int `json:"day_of_week"       db:"day_of_week"`
	LessonNumber     int `json:"lesson_number"     db:"lesson_number"`
	PreferenceWeight int `json:"preference_weight" db:"preference_weight"`
}

package model

type Penalty struct {
	ID          int    `json:"id"           db:"id"`
	PenaltyName string `json:"penalty_name" db:"penalty_name"`
}

type LessonVersionPenalty struct {
	LessonsVersionsID int `json:"lessons_versions_id" db:"lessons_versions_id"`
	PenaltyID         int `json:"penalty_id"          db:"penalty_id"`
	Weight            int `json:"weight"              db:"weight"`
}

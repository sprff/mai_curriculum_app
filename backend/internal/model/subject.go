package model

type Subject struct {
	ID                    int    `json:"id"                       db:"id"`
	Name                  string `json:"name"                     db:"name"`
	WeeklyNumberOfLessons int    `json:"weekly_number_of_lessons" db:"weekly_number_of_lessons"`
}

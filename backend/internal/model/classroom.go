package model

type Classroom struct {
	ID         int    `json:"id"          db:"id"`
	Capacity   int    `json:"capacity"    db:"capacity"`
	RoomNumber string `json:"room_number" db:"room_number"`
}

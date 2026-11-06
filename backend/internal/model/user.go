package model

type User struct {
	ID           int    `json:"id"                 db:"id"`
	Role         string `json:"role"               db:"role"`
	Name         string `json:"name"               db:"name"`
	Login        string `json:"login"              db:"login"`
	Email        string `json:"email"              db:"email"`
	PasswordHash string `json:"password_hash"      db:"password_hash"`
	GroupID      *int   `json:"group_id,omitempty" db:"group_id"`
}

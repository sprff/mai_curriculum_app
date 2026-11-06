// Package auth contains authentication rules independent of HTTP and PostgreSQL.
package auth

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"
)

type Role string

const (
	Admin   Role = "ADMIN"
	Teacher Role = "TEACHER"
	Student Role = "STUDENT"
)

func (r Role) Valid() bool { return r == Admin || r == Teacher || r == Student }

type User struct {
	ID           int64
	Login        string
	FullName     string
	Role         Role
	PasswordHash string
}

func (u User) PublicID() string { return strconv.FormatInt(u.ID, 10) }

type NewUser struct {
	Login        string
	FullName     string
	Role         Role
	PasswordHash string
}

var (
	ErrNotFound     = errors.New("user not found")
	ErrCredentials  = errors.New("invalid credentials")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrSelfDelete   = errors.New("cannot delete current user")
	ErrLastAdmin    = errors.New("cannot delete last administrator")
	ErrConflict     = errors.New("login already exists")
	ErrReferenced   = errors.New("user is referenced by other records")
	ErrInvalid      = errors.New("invalid input")
	ErrUnavailable  = errors.New("authentication dependency unavailable")
)

// Users implementations must recheck the actor and enforce write rules atomically.
type Users interface {
	ByID(context.Context, int64) (User, error)
	ByLogin(context.Context, string) (User, error)
	Create(context.Context, int64, NewUser) (User, error)
	Delete(context.Context, int64, int64) error
}

type Session struct {
	UserID      int64
	RefreshHash string
	CreatedAt   time.Time
	ExpiresAt   time.Time
}

// SessionCreator will be implemented after the team agrees on persistent storage.
// A raw refresh token must never be persisted.
type SessionCreator interface {
	CreateSession(context.Context, Session) error
}

type Tokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
}
type principalKey struct{}

func WithUser(ctx context.Context, user User) context.Context {
	return context.WithValue(ctx, principalKey{}, user)
}
func CurrentUser(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(principalKey{}).(User)
	return user, ok
}
func ParseID(id string) (int64, error) {
	n, err := strconv.ParseInt(id, 10, 32)
	if err != nil || n <= 0 {
		return 0, ErrNotFound
	}
	return n, nil
}
func validUser(u User) bool {
	return u.ID > 0 && u.ID <= 2147483647 && u.Login != "" && strings.TrimSpace(u.FullName) != "" && u.Role.Valid()
}

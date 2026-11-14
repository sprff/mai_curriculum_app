// Package postgres adapts the existing users table; it performs no schema changes.
package postgres

import (
	"backend/internal/auth"
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"strings"
	"time"
)

type Users struct{ pool *pgxpool.Pool }

func Open(ctx context.Context, url string) (*Users, error) {
	if url == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, errors.New("invalid DATABASE_URL")
	}
	config.MaxConns = 5
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, errors.New("could not initialize PostgreSQL pool")
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, errors.New("could not connect to PostgreSQL")
	}
	return &Users{pool: pool}, nil
}
func (u *Users) Close() { u.pool.Close() }

const columns = "id, login, COALESCE(name, ''), role::text, password_hash"

type scanner interface{ Scan(...any) error }

func scanUser(row scanner) (auth.User, error) {
	var user auth.User
	var role string
	if err := row.Scan(&user.ID, &user.Login, &user.FullName, &role, &user.PasswordHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return auth.User{}, auth.ErrNotFound
		}
		return auth.User{}, err
	}
	user.Role = auth.Role(strings.ToUpper(role))
	if !user.Role.Valid() {
		return auth.User{}, errors.New("unknown database role")
	}
	return user, nil
}
func (u *Users) ByID(ctx context.Context, id int64) (auth.User, error) {
	return scanUser(u.pool.QueryRow(ctx, "SELECT "+columns+" FROM public.users WHERE id=$1", id))
}
func (u *Users) ByLogin(ctx context.Context, login string) (auth.User, error) {
	// The database enforces UNIQUE(login); the agreed login comparison is case-sensitive.
	return scanUser(u.pool.QueryRow(ctx, "SELECT "+columns+" FROM public.users WHERE login=$1", login))
}
func (u *Users) write(ctx context.Context, actorID, targetID int64, action func(pgx.Tx) error) error {
	tx, err := u.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return err
	}
	defer func() {
		rollbackCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rollbackCtx)
	}()
	// Lock administrator and target rows in a consistent order. This serializes
	// administrator changes while allowing unrelated user writes to proceed.
	rows, err := tx.Query(ctx, "SELECT id FROM public.users WHERE role = 'admin' OR id = $1 ORDER BY id FOR UPDATE", targetID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	var role string
	if err := tx.QueryRow(ctx, "SELECT role::text FROM public.users WHERE id=$1", actorID).Scan(&role); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return auth.ErrUnauthorized
		}
		return err
	}
	if role != "admin" {
		return auth.ErrForbidden
	}
	if err := action(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (u *Users) Create(ctx context.Context, actorID int64, input auth.NewUser) (auth.User, error) {
	var result auth.User
	err := u.write(ctx, actorID, actorID, func(tx pgx.Tx) error {
		var err error
		result, err = scanUser(tx.QueryRow(ctx,
			"INSERT INTO public.users (login, name, role, password_hash) VALUES ($1,$2,$3::public.order_roles,$4) RETURNING "+columns,
			input.Login, input.FullName, strings.ToLower(string(input.Role)), input.PasswordHash))
		return err
	})
	return result, mapWriteError(err)
}
func (u *Users) Delete(ctx context.Context, actorID, targetID int64) error {
	if actorID == targetID {
		return auth.ErrSelfDelete
	}
	return mapWriteError(u.write(ctx, actorID, targetID, func(tx pgx.Tx) error {
		var role string
		err := tx.QueryRow(ctx, "SELECT role::text FROM public.users WHERE id=$1", targetID).Scan(&role)
		if errors.Is(err, pgx.ErrNoRows) {
			return auth.ErrNotFound
		}
		if err != nil {
			return err
		}
		if role == "admin" {
			var count int
			if err := tx.QueryRow(ctx, "SELECT COUNT(*) FROM public.users WHERE role='admin'").Scan(&count); err != nil {
				return err
			}
			if count <= 1 {
				return auth.ErrLastAdmin
			}
		}
		_, err = tx.Exec(ctx, "DELETE FROM public.users WHERE id=$1", targetID)
		return err
	}))
}
func mapWriteError(err error) error {
	if err == nil {
		return nil
	}
	var postgresError *pgconn.PgError
	if errors.As(err, &postgresError) {
		switch postgresError.Code {
		case "23505":
			return auth.ErrConflict
		case "23503":
			return auth.ErrReferenced
		}
	}
	return fmt.Errorf("users operation: %w", err)
}

var _ auth.Users = (*Users)(nil)

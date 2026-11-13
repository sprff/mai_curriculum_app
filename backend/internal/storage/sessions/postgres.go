// Package sessions stores refresh sessions in a separate PostgreSQL database.
package sessions

import (
	"backend/internal/auth"
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ pool *pgxpool.Pool }

func Open(ctx context.Context, databaseURL string) (*Store, error) {
	if databaseURL == "" {
		return nil, errors.New("SESSION_DATABASE_URL is required")
	}
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, errors.New("invalid SESSION_DATABASE_URL")
	}
	cfg.MaxConns = 5
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, errors.New("could not initialize session database")
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, errors.New("could not connect to session database")
	}
	return &Store{pool: pool}, nil
}
func (s *Store) Close() { s.pool.Close() }

// CreateSession stores only the SHA-256 digest, never the refresh token itself.
func (s *Store) CreateSession(ctx context.Context, session auth.Session) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO auth_sessions
 (user_id, refresh_hash, created_at, expires_at)
 VALUES ($1, $2, $3, $4)`, session.UserID, session.RefreshHash, session.CreatedAt, session.ExpiresAt)
	return err
}

// Rotate replaces a refresh digest once, atomically, while retaining its original expiry.
func (s *Store) Rotate(ctx context.Context, oldHash, newHash string, now time.Time) (int64, error) {
	var userID int64
	err := s.pool.QueryRow(ctx, `UPDATE auth_sessions SET refresh_hash = $2
 WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > $3 RETURNING user_id`,
		oldHash, newHash, now).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, auth.ErrInvalid
	}
	return userID, err
}

// Revoke invalidates the matching session without affecting other sessions.
func (s *Store) Revoke(ctx context.Context, refreshHash string, now time.Time) error {
	result, err := s.pool.Exec(ctx, `UPDATE auth_sessions SET revoked_at = $2
 WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > $2`, refreshHash, now)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return auth.ErrInvalid
	}
	return nil
}

var _ auth.SessionCreator = (*Store)(nil)

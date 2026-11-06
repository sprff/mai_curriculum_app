package postgres

import (
	"backend/internal/auth"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"testing"
)

type testRow struct {
	role string
	err  error
}

func (r testRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	*dest[0].(*int64) = 12
	*dest[1].(*string) = "student"
	*dest[2].(*string) = "Full Name"
	*dest[3].(*string) = r.role
	*dest[4].(*string) = "stored hash"
	return nil
}
func TestDatabaseRoleMapping(t *testing.T) {
	for _, tc := range []struct {
		db   string
		want auth.Role
	}{{"admin", auth.Admin}, {"teacher", auth.Teacher}, {"student", auth.Student}} {
		user, err := scanUser(testRow{role: tc.db})
		if err != nil || user.Role != tc.want || user.PublicID() != "12" || user.FullName != "Full Name" {
			t.Fatalf("mapping %s failed: %v", tc.db, err)
		}
	}
	if _, err := scanUser(testRow{role: "unknown"}); err == nil {
		t.Fatal("unknown role accepted")
	}
	if _, err := scanUser(testRow{err: pgx.ErrNoRows}); !errors.Is(err, auth.ErrNotFound) {
		t.Fatal("not found mapping failed")
	}
}
func TestConstraintErrorMapping(t *testing.T) {
	if !errors.Is(mapWriteError(&pgconn.PgError{Code: "23505"}), auth.ErrConflict) {
		t.Fatal("unique error mapping")
	}
	if !errors.Is(mapWriteError(&pgconn.PgError{Code: "23503"}), auth.ErrReferenced) {
		t.Fatal("reference error mapping")
	}
}

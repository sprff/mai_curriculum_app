package postgres

import (
	"backend/internal/auth"
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestUsersWithPostgres(t *testing.T) {
	url := os.Getenv("AUTH_USERS_INTEGRATION_DATABASE_URL")
	if url == "" {
		t.Skip("set AUTH_USERS_INTEGRATION_DATABASE_URL for isolated PostgreSQL integration")
	}
	if !strings.Contains(url, "/auth_unique_review?") {
		t.Fatal("integration tests require the dedicated auth_unique_review database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	users, err := Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(users.Close)
	var dbName string
	if err := users.pool.QueryRow(ctx, "SELECT current_database()").Scan(&dbName); err != nil || dbName != "auth_unique_review" {
		t.Fatal("not the dedicated test database")
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	var adminA, adminB int64
	for i, id := range []*int64{&adminA, &adminB} {
		err := users.pool.QueryRow(ctx, "INSERT INTO public.users (login, name, role, password_hash) VALUES ($1, 'Test admin', 'admin', 'test') RETURNING id", fmt.Sprintf("test_%s_%d", suffix, i)).Scan(id)
		if err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = users.pool.Exec(cleanupCtx, "DELETE FROM public.users WHERE id = ANY($1)", []int64{adminA, adminB})
	})

	// Exact duplicates must fail while names differing only in case remain distinct.
	login := "Case_" + suffix
	first, err := users.Create(ctx, adminA, auth.NewUser{Login: login, FullName: "Student", Role: auth.Student, PasswordHash: "test"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = users.pool.Exec(context.Background(), "DELETE FROM public.users WHERE id=$1", first.ID) })
	if _, err = users.Create(ctx, adminA, auth.NewUser{Login: login, FullName: "Student", Role: auth.Student, PasswordHash: "test"}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("duplicate: %v", err)
	}
	second, err := users.Create(ctx, adminA, auth.NewUser{Login: strings.ToLower(login), FullName: "Student", Role: auth.Student, PasswordHash: "test"})
	if err != nil {
		t.Fatalf("case-sensitive login: %v", err)
	}
	t.Cleanup(func() {
		_, _ = users.pool.Exec(context.Background(), "DELETE FROM public.users WHERE id=$1", second.ID)
	})
	found, err := users.ByLogin(ctx, login)
	if err != nil || found.ID != first.ID {
		t.Fatalf("lookup: %v", err)
	}
	if _, err := users.ByLogin(ctx, "missing_"+suffix); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("missing: %v", err)
	}
	if err := users.Delete(ctx, adminA, adminA); !errors.Is(err, auth.ErrSelfDelete) {
		t.Fatalf("self delete: %v", err)
	}

	// Holding the actor row during a role change must prevent stale admin access.
	tx, err := users.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, "UPDATE public.users SET role='student' WHERE id=$1", adminA); err != nil {
		t.Fatal(err)
	}
	denied := make(chan error, 1)
	go func() {
		_, err := users.Create(ctx, adminA, auth.NewUser{Login: "denied_" + suffix, FullName: "Denied", Role: auth.Student, PasswordHash: "test"})
		denied <- err
	}()
	select {
	case early := <-denied:
		_ = tx.Rollback(ctx)
		t.Fatalf("write completed before role change committed: %v", early)
	case <-time.After(150 * time.Millisecond):
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if err = <-denied; !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("demoted actor: %v", err)
	}
	if _, err = users.pool.Exec(ctx, "UPDATE public.users SET role='admin' WHERE id=$1", adminA); err != nil {
		t.Fatal(err)
	}

	// Two admins attempt to delete one another simultaneously: at least one must remain.
	start := make(chan struct{})
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for _, pair := range [][2]int64{{adminA, adminB}, {adminB, adminA}} {
		wg.Add(1)
		go func(pair [2]int64) { defer wg.Done(); <-start; results <- users.Delete(ctx, pair[0], pair[1]) }(pair)
	}
	close(start)
	wg.Wait()
	close(results)
	success := 0
	for err := range results {
		if err == nil {
			success++
		} else if !errors.Is(err, auth.ErrUnauthorized) && !errors.Is(err, auth.ErrNotFound) && !errors.Is(err, auth.ErrLastAdmin) {
			t.Fatalf("parallel deletion: %v", err)
		}
	}
	var remaining int
	if err = users.pool.QueryRow(ctx, "SELECT COUNT(*) FROM public.users WHERE id=ANY($1) AND role='admin'", []int64{adminA, adminB}).Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining < 1 || success != 1 {
		t.Fatalf("remaining=%d, successful deletes=%d", remaining, success)
	}
}

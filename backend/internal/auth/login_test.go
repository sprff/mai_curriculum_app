package auth

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestLoginFormat(t *testing.T) {
	valid := []string{"abc", "Olya", "olya", "user.name-123_test", strings.Repeat("a", 32), "123", "._-"}
	for _, login := range valid {
		if err := ValidateLogin(login); err != nil {
			t.Errorf("valid login %q rejected: %v", login, err)
		}
	}
	invalid := []string{"", "ab", strings.Repeat("a", 33), "Оля", "café", "user name", " user", "user ", "user\t", "user\n", "a@b.ru", "a:b", "a/b", "a\\b", "user%", "user₽", "ab\x00"}
	for _, login := range invalid {
		if err := ValidateLogin(login); !errors.Is(err, ErrInvalidLogin) {
			t.Errorf("invalid login %q accepted", login)
		}
	}
}
func TestServiceRejectsInvalidLoginsBeforeStorage(t *testing.T) {
	service, users, _ := setup(t, nil)
	ctx := context.Background()
	for _, login := range []string{"ab", "Ольга", "user name", "a@b.ru", strings.Repeat("a", 33)} {
		if _, err := service.Authenticate(ctx, login, "password"); !errors.Is(err, ErrInvalidLogin) {
			t.Fatalf("authentication: %v", err)
		}
		adminCtx := WithUser(ctx, users.users[1])
		if _, err := service.CreateUser(adminCtx, login, "password", "Name", Student); !errors.Is(err, ErrInvalidLogin) {
			t.Fatalf("creation: %v", err)
		}
	}
	if users.loginCalls != 0 || users.createCalls != 0 {
		t.Fatal("invalid logins reached storage")
	}
}
func TestLoginsAreCaseSensitive(t *testing.T) {
	service, users, _ := setup(t, nil)
	users.users[3] = User{ID: 3, Login: "Olya", FullName: "Upper case", Role: Student, PasswordHash: "test:upper"}
	users.users[4] = User{ID: 4, Login: "olya", FullName: "Lower case", Role: Student, PasswordHash: "test:lower"}
	for _, tc := range []struct {
		login, password string
		id              int64
	}{{"Olya", "upper", 3}, {"olya", "lower", 4}} {
		user, err := service.Authenticate(context.Background(), tc.login, tc.password)
		if err != nil || user.ID != tc.id {
			t.Fatalf("login %q: got user %d, error %v", tc.login, user.ID, err)
		}
	}
	for _, tc := range []struct{ login, password string }{{"Olya", "lower"}, {"olya", "upper"}, {"OLYA", "upper"}} {
		if _, err := service.Authenticate(context.Background(), tc.login, tc.password); !errors.Is(err, ErrCredentials) {
			t.Fatalf("case was normalized for %q: %v", tc.login, err)
		}
	}
	adminCtx := WithUser(context.Background(), users.users[1])
	user, err := service.CreateUser(adminCtx, "OLYA", "password", "Another user", Student)
	if err != nil || user.Login != "OLYA" {
		t.Fatalf("creation normalized login: %v", err)
	}
}

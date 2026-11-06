package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"strings"
	"testing"
	"time"
)

type testPasswords struct{}

func (testPasswords) Hash(p string) (string, error) {
	if p == "" {
		return "", ErrInvalid
	}
	return "test:" + p, nil
}
func (testPasswords) Verify(h, p string) bool { return h == "test:"+p }

type testUsers struct {
	users                    map[int64]User
	createCalls, deleteCalls int
	loginCalls               int
	deleteError              error
}

func (r *testUsers) ByID(_ context.Context, id int64) (User, error) {
	u, ok := r.users[id]
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}
func (r *testUsers) ByLogin(ctx context.Context, login string) (User, error) {
	r.loginCalls++
	for _, u := range r.users {
		if u.Login == login {
			return u, nil
		}
	}
	return User{}, ErrNotFound
}
func (r *testUsers) Create(_ context.Context, _ int64, n NewUser) (User, error) {
	r.createCalls++
	for _, u := range r.users {
		if u.Login == n.Login {
			return User{}, ErrConflict
		}
	}
	u := User{ID: 99, Login: n.Login, FullName: n.FullName, Role: n.Role, PasswordHash: n.PasswordHash}
	r.users[u.ID] = u
	return u, nil
}
func (r *testUsers) Delete(_ context.Context, _ int64, id int64) error {
	r.deleteCalls++
	if r.deleteError != nil {
		return r.deleteError
	}
	if _, ok := r.users[id]; !ok {
		return ErrNotFound
	}
	delete(r.users, id)
	return nil
}

type testSessions struct {
	sessions []Session
	err      error
}

func (r *testSessions) CreateSession(_ context.Context, s Session) error {
	if r.err != nil {
		return r.err
	}
	r.sessions = append(r.sessions, s)
	return nil
}
func setup(t *testing.T, sessions SessionCreator) (*Service, *testUsers, *AccessTokens) {
	t.Helper()
	users := &testUsers{users: map[int64]User{
		1: {ID: 1, Login: "admin", FullName: "Admin", Role: Admin, PasswordHash: "test:password"},
		2: {ID: 2, Login: "student", FullName: "Student", Role: Student, PasswordHash: "test:password"},
	}}
	tokens, err := NewAccessTokens(strings.Repeat("s", 32))
	if err != nil {
		t.Fatal(err)
	}
	service, err := NewService(users, testPasswords{}, tokens, sessions)
	if err != nil {
		t.Fatal(err)
	}
	return service, users, tokens
}
func TestAuthenticate(t *testing.T) {
	s, _, _ := setup(t, nil)
	cases := []struct {
		login, password string
		want            error
	}{
		{"admin", "password", nil}, {"admin", "wrong", ErrCredentials}, {"missing", "password", ErrCredentials},
		{"", "password", ErrInvalidLogin}, {"admin", "", ErrInvalid},
	}
	for _, tc := range cases {
		_, err := s.Authenticate(context.Background(), tc.login, tc.password)
		if !errors.Is(err, tc.want) {
			t.Fatalf("login %q: got %v want %v", tc.login, err, tc.want)
		}
	}
}
func TestLoginRequiresPersistentSessions(t *testing.T) {
	s, _, _ := setup(t, nil)
	tokens, err := s.Login(context.Background(), "admin", "password")
	if !errors.Is(err, ErrUnavailable) || tokens.AccessToken != "" || tokens.RefreshToken != "" {
		t.Fatalf("tokens issued without storage: %v", err)
	}
}
func TestLoginStoresOnlyRefreshHashAndAllowsMultipleSessions(t *testing.T) {
	sessions := &testSessions{}
	s, _, tokens := setup(t, sessions)
	now := time.Date(2026, 11, 7, 10, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return now }
	first, err := s.Login(context.Background(), "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.Login(context.Background(), "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	if first.ExpiresIn != 900 || first.RefreshToken == second.RefreshToken || len(sessions.sessions) != 2 {
		t.Fatal("invalid tokens or session count")
	}
	digest := sha256.Sum256([]byte(first.RefreshToken))
	saved := sessions.sessions[0]
	if saved.RefreshHash != hex.EncodeToString(digest[:]) || saved.RefreshHash == first.RefreshToken {
		t.Fatal("raw token persisted or wrong hash")
	}
	if saved.UserID != 1 || !saved.ExpiresAt.Equal(now.AddDate(0, 6, 0)) {
		t.Fatal("incorrect session owner or expiry")
	}
	if id, err := tokens.Verify(first.AccessToken); err != nil || id != 1 {
		t.Fatalf("invalid access token: %v", err)
	}
}
func TestSessionFailureDoesNotReturnTokens(t *testing.T) {
	s, _, _ := setup(t, &testSessions{err: ErrUnavailable})
	result, err := s.Login(context.Background(), "admin", "password")
	if !errors.Is(err, ErrUnavailable) || result.AccessToken != "" || result.RefreshToken != "" {
		t.Fatal("tokens leaked on storage failure")
	}
}
func TestAccessTokensRejectInvalidClaims(t *testing.T) {
	_, _, tokens := setup(t, nil)
	now := time.Now().Truncate(time.Second)
	tokens.now = func() time.Time { return now }
	valid, err := tokens.Issue(1)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tokens.Verify(valid); err != nil {
		t.Fatal(err)
	}
	other, _ := NewAccessTokens(strings.Repeat("x", 32))
	if _, err := other.Verify(valid); !errors.Is(err, ErrUnauthorized) {
		t.Fatal("wrong key accepted")
	}
	invalid := []struct {
		name   string
		method jwt.SigningMethod
		claims jwt.RegisteredClaims
	}{
		{"algorithm", jwt.SigningMethodHS384, jwt.RegisteredClaims{Subject: "1", Issuer: tokenIssuer, Audience: jwt.ClaimStrings{tokenAudience}, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute))}},
		{"missing expiration", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "1", Issuer: tokenIssuer, Audience: jwt.ClaimStrings{tokenAudience}, IssuedAt: jwt.NewNumericDate(now)}},
		{"wrong issuer", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "1", Issuer: "other", Audience: jwt.ClaimStrings{tokenAudience}, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute))}},
		{"wrong audience", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "1", Issuer: tokenIssuer, Audience: jwt.ClaimStrings{"other"}, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute))}},
		{"invalid subject", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "abc", Issuer: tokenIssuer, Audience: jwt.ClaimStrings{tokenAudience}, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute))}},
		{"future issued at", jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: "1", Issuer: tokenIssuer, Audience: jwt.ClaimStrings{tokenAudience}, IssuedAt: jwt.NewNumericDate(now.Add(time.Hour)), ExpiresAt: jwt.NewNumericDate(now.Add(2 * time.Hour))}},
	}
	for _, tc := range invalid {
		t.Run(tc.name, func(t *testing.T) {
			raw, err := jwt.NewWithClaims(tc.method, tc.claims).SignedString(tokens.key)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := tokens.Verify(raw); !errors.Is(err, ErrUnauthorized) {
				t.Fatal("invalid token accepted")
			}
		})
	}
	tokens.now = func() time.Time { return now.Add(AccessTTL) }
	if _, err := tokens.Verify(valid); !errors.Is(err, ErrUnauthorized) {
		t.Fatal("expired token accepted")
	}
}
func TestAuthorizeUsesCurrentDatabaseRoleAndRejectsDeletedUser(t *testing.T) {
	s, users, tokens := setup(t, nil)
	raw, _ := tokens.Issue(1)
	user := users.users[1]
	user.Role = Student
	users.users[1] = user
	current, err := s.Authorize(context.Background(), raw)
	if err != nil || current.Role != Student {
		t.Fatal("stale role retained")
	}
	delete(users.users, 1)
	if _, err := s.Authorize(context.Background(), raw); !errors.Is(err, ErrUnauthorized) {
		t.Fatal("deleted user accepted")
	}
}
func TestAdministratorRules(t *testing.T) {
	s, users, _ := setup(t, nil)
	ctx := context.Background()
	if _, err := s.CreateUser(ctx, "new", "password", "Name", Student); !errors.Is(err, ErrUnauthorized) {
		t.Fatal(err)
	}
	studentCtx := WithUser(ctx, users.users[2])
	if _, err := s.CreateUser(studentCtx, "new", "password", "Name", Student); !errors.Is(err, ErrForbidden) {
		t.Fatal(err)
	}
	if err := s.DeleteUser(studentCtx, "1"); !errors.Is(err, ErrForbidden) {
		t.Fatal(err)
	}
	if users.createCalls != 0 || users.deleteCalls != 0 {
		t.Fatal("unauthorized write attempted")
	}
	adminCtx := WithUser(ctx, users.users[1])
	if err := s.DeleteUser(adminCtx, "1"); !errors.Is(err, ErrSelfDelete) {
		t.Fatal(err)
	}
	if users.deleteCalls != 0 {
		t.Fatal("self deletion reached repository")
	}
	created, err := s.CreateUser(adminCtx, "new", "password", "Full Name", Teacher)
	if err != nil || created.Role != Teacher || created.PasswordHash == "password" {
		t.Fatalf("create failed: %v", err)
	}
	if _, err := s.CreateUser(adminCtx, "new", "password", "Full Name", Teacher); !errors.Is(err, ErrConflict) {
		t.Fatal(err)
	}
	users.deleteError = ErrLastAdmin
	if err := s.DeleteUser(adminCtx, "99"); !errors.Is(err, ErrLastAdmin) {
		t.Fatal("last admin error lost")
	}
}
func TestBcryptPasswords(t *testing.T) {
	p := BcryptPasswords{}
	hash, err := p.Hash("correct password")
	if err != nil {
		t.Fatal(err)
	}
	if hash == "correct password" || !p.Verify(hash, "correct password") || p.Verify(hash, "wrong") {
		t.Fatal("password check failed")
	}
	if p.Verify("not-a-hash", "correct password") {
		t.Fatal("invalid hash accepted")
	}
	if _, err := p.Hash(strings.Repeat("a", 73)); !errors.Is(err, ErrInvalid) {
		t.Fatal("overlong password accepted")
	}
	if p.Verify(hash, strings.Repeat("a", 73)) {
		t.Fatal("overlong password accepted")
	}
}
func TestWeakSigningSecretRejected(t *testing.T) {
	if _, err := NewAccessTokens("short"); err == nil {
		t.Fatal("short signing key accepted")
	}
}

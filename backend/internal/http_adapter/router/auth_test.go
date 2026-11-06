package router

import (
	"backend/internal/auth"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// All records and sessions below exist only inside tests, never in the application.
type httpUsers struct{ records map[int64]auth.User }

func (r *httpUsers) ByID(_ context.Context, id int64) (auth.User, error) {
	u, ok := r.records[id]
	if !ok {
		return auth.User{}, auth.ErrNotFound
	}
	return u, nil
}
func (r *httpUsers) ByLogin(_ context.Context, login string) (auth.User, error) {
	for _, u := range r.records {
		if u.Login == login {
			return u, nil
		}
	}
	return auth.User{}, auth.ErrNotFound
}
func (r *httpUsers) Create(_ context.Context, _ int64, n auth.NewUser) (auth.User, error) {
	for _, u := range r.records {
		if u.Login == n.Login {
			return auth.User{}, auth.ErrConflict
		}
	}
	u := auth.User{ID: 3, Login: n.Login, FullName: n.FullName, Role: n.Role, PasswordHash: n.PasswordHash}
	r.records[u.ID] = u
	return u, nil
}
func (r *httpUsers) Delete(_ context.Context, _ int64, id int64) error {
	if id == 99 {
		return auth.ErrLastAdmin
	}
	if _, ok := r.records[id]; !ok {
		return auth.ErrNotFound
	}
	delete(r.records, id)
	return nil
}

type httpSessions struct{}

func (httpSessions) CreateSession(context.Context, auth.Session) error { return nil }
func request(t *testing.T, h http.Handler, method, path, body, token string, status int) map[string]json.RawMessage {
	t.Helper()
	req := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != status {
		t.Fatalf("%s %s: status=%d want=%d body=%s", method, path, res.Code, status, res.Body.String())
	}
	if res.Body.Len() == 0 {
		return nil
	}
	var data map[string]json.RawMessage
	if err := json.Unmarshal(res.Body.Bytes(), &data); err != nil {
		t.Fatal(err)
	}
	return data
}
func TestAuthHTTPFlow(t *testing.T) {
	passwords := auth.BcryptPasswords{}
	hash, err := passwords.Hash("test-password")
	if err != nil {
		t.Fatal(err)
	}
	users := &httpUsers{records: map[int64]auth.User{
		1: {ID: 1, Login: "admin", FullName: "Administrator", Role: auth.Admin, PasswordHash: hash},
		2: {ID: 2, Login: "student", FullName: "Student", Role: auth.Student, PasswordHash: hash},
	}}
	tokens, err := auth.NewAccessTokens(strings.Repeat("s", 32))
	if err != nil {
		t.Fatal(err)
	}
	service, err := auth.NewService(users, passwords, tokens, httpSessions{})
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(service)
	if err != nil {
		t.Fatal(err)
	}
	login := request(t, handler, "POST", "/auth/login", `{"login":"admin","password":"test-password"}`, "", 200)
	if len(login) != 3 || login["access_token"] == nil || login["refresh_token"] == nil || string(login["expires_in"]) != "900" {
		t.Fatalf("unexpected login response: %v", login)
	}
	var adminToken string
	json.Unmarshal(login["access_token"], &adminToken)
	profile := request(t, handler, "GET", "/auth/me", "", adminToken, 200)
	if len(profile) != 4 || string(profile["id"]) != `"1"` || string(profile["role"]) != `"ADMIN"` || profile["fullName"] == nil {
		t.Fatalf("unexpected profile: %v", profile)
	}
	for _, body := range []string{`{"login":"admin","password":"wrong"}`, `{"login":"missing","password":"wrong"}`} {
		data := request(t, handler, "POST", "/auth/login", body, "", 404)
		if string(data["code"]) != `"INVALID_CREDENTIALS"` {
			t.Fatal("inconsistent credential errors")
		}
	}
	for _, invalidLogin := range []string{"ab", "Ольга", "user name", "a@b.ru", strings.Repeat("a", 33)} {
		body, err := json.Marshal(map[string]string{"login": invalidLogin, "password": "password", "fullName": "Name", "role": "STUDENT"})
		if err != nil {
			t.Fatal(err)
		}
		data := request(t, handler, "POST", "/users", string(body), adminToken, 400)
		if string(data["code"]) != `"INVALID_LOGIN"` {
			t.Fatalf("unexpected creation error: %v", data)
		}
	}
	studentToken, _ := tokens.Issue(2)
	create := `{"login":"new","password":"new-password","fullName":"New Teacher","role":"TEACHER"}`
	request(t, handler, "POST", "/users", create, studentToken, 403)
	request(t, handler, "DELETE", "/users/1", "", studentToken, 403)
	request(t, handler, "POST", "/users", create, "", 401)
	created := request(t, handler, "POST", "/users", create, adminToken, 200)
	if len(created) != 4 || string(created["role"]) != `"TEACHER"` {
		t.Fatal("invalid created profile")
	}
	request(t, handler, "POST", "/users", create, adminToken, 409)
	request(t, handler, "DELETE", "/users/1", "", adminToken, 403)
	request(t, handler, "DELETE", "/users/99", "", adminToken, 403)
	request(t, handler, "DELETE", "/users/not-an-id", "", adminToken, 404)
	request(t, handler, "DELETE", "/users/2147483648", "", adminToken, 404)
	request(t, handler, "DELETE", "/users/2", "", adminToken, 200)
	request(t, handler, "GET", "/auth/me", "", studentToken, 401)
	request(t, handler, "DELETE", "/users/2", "", adminToken, 404)
}
func TestConfiguredAuthWithoutSessionStorage(t *testing.T) {
	p := auth.BcryptPasswords{}
	hash, err := p.Hash("test-password")
	if err != nil {
		t.Fatal(err)
	}
	users := &httpUsers{records: map[int64]auth.User{1: {ID: 1, Login: "admin", FullName: "Admin", Role: auth.Admin, PasswordHash: hash}}}
	tokens, _ := auth.NewAccessTokens(strings.Repeat("s", 32))
	service, err := auth.NewService(users, p, tokens, nil)
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(service)
	if err != nil {
		t.Fatal(err)
	}
	data := request(t, handler, "POST", "/auth/login", `{"login":"admin","password":"test-password"}`, "", 503)
	if string(data["code"]) != `"AUTH_UNAVAILABLE"` {
		t.Fatal("missing storage should be explicit")
	}
	if data["access_token"] != nil || data["refresh_token"] != nil {
		t.Fatal("tokens issued without persistent sessions")
	}
	request(t, handler, "POST", "/auth/logout", `{"refresh_token":"sample"}`, "", 501)
	request(t, handler, "POST", "/auth/refresh", `{"refresh_token":"sample"}`, "", 501)
}

type failingUsers struct{ httpUsers }

func (failingUsers) ByID(context.Context, int64) (auth.User, error) {
	return auth.User{}, errors.New("private database error")
}
func TestDatabaseFailureDoesNotLeakDetails(t *testing.T) {
	tokens, _ := auth.NewAccessTokens(strings.Repeat("s", 32))
	service, err := auth.NewService(&failingUsers{}, auth.BcryptPasswords{}, tokens, nil)
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(service)
	if err != nil {
		t.Fatal(err)
	}
	token, _ := tokens.Issue(1)
	data := request(t, handler, "GET", "/auth/me", "", token, 503)
	if string(data["message"]) != `"Service Unavailable"` {
		t.Fatal("internal error details exposed")
	}
}

// TestLoginFormatHTTP checks the actual HTTP response even before auth storage is configured.
func TestLoginFormatHTTP(t *testing.T) {
	handler, err := New()
	if err != nil {
		t.Fatal(err)
	}
	for _, login := range []string{"ab", "Ольга", "user name", "a@b.ru", strings.Repeat("a", 33), "user\n"} {
		body, err := json.Marshal(map[string]string{"login": login, "password": "password"})
		if err != nil {
			t.Fatal(err)
		}
		data := request(t, handler, "POST", "/auth/login", string(body), "", 400)
		if string(data["code"]) != `"INVALID_LOGIN"` {
			t.Fatalf("unexpected validation error: %v", data)
		}
	}
}

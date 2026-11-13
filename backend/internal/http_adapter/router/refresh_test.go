package router

import (
	"backend/internal/auth"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

type refreshStore struct{ sessions map[string]auth.Session }

func (s *refreshStore) CreateSession(_ context.Context, session auth.Session) error {
	s.sessions[session.RefreshHash] = session
	return nil
}
func (s *refreshStore) Rotate(_ context.Context, oldHash, newHash string, now time.Time) (int64, error) {
	session, ok := s.sessions[oldHash]
	if !ok || !now.Before(session.ExpiresAt) {
		return 0, auth.ErrInvalid
	}
	delete(s.sessions, oldHash)
	session.RefreshHash = newHash
	s.sessions[newHash] = session
	return session.UserID, nil
}
func (s *refreshStore) Revoke(_ context.Context, hash string, now time.Time) error {
	session, ok := s.sessions[hash]
	if !ok || !now.Before(session.ExpiresAt) {
		return auth.ErrInvalid
	}
	delete(s.sessions, hash)
	return nil
}
func TestRefreshAndLogoutHTTP(t *testing.T) {
	password := auth.BcryptPasswords{}
	hash, err := password.Hash("password")
	if err != nil {
		t.Fatal(err)
	}
	users := &httpUsers{records: map[int64]auth.User{1: {ID: 1, Login: "admin", FullName: "Admin", Role: auth.Admin, PasswordHash: hash}}}
	keys, err := auth.NewAccessTokens(strings.Repeat("s", 32))
	if err != nil {
		t.Fatal(err)
	}
	service, err := auth.NewService(users, password, keys, &refreshStore{sessions: make(map[string]auth.Session)})
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(service)
	if err != nil {
		t.Fatal(err)
	}
	login := request(t, handler, "POST", "/auth/login", `{"login":"admin","password":"password"}`, "", 200)
	var old string
	if err = json.Unmarshal(login["refresh_token"], &old); err != nil {
		t.Fatal(err)
	}
	payload, _ := json.Marshal(map[string]string{"refresh_token": old})
	refreshed := request(t, handler, "POST", "/auth/refresh", string(payload), "", 200)
	var next string
	if err = json.Unmarshal(refreshed["refresh_token"], &next); err != nil {
		t.Fatal(err)
	}
	if next == old {
		t.Fatal("token was not rotated")
	}
	invalid := request(t, handler, "POST", "/auth/refresh", string(payload), "", 400)
	if string(invalid["code"]) != `"INVALID_REFRESH_TOKEN"` {
		t.Fatal(errors.New("old token accepted"))
	}
	nextBody, _ := json.Marshal(map[string]string{"refresh_token": next})
	request(t, handler, "POST", "/auth/logout", string(nextBody), "", 204)
	request(t, handler, "POST", "/auth/refresh", string(nextBody), "", 400)
}

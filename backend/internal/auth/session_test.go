package auth

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

type sessionMemory struct {
	mu     sync.Mutex
	byHash map[string]Session
}

func (m *sessionMemory) CreateSession(_ context.Context, s Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.byHash[s.RefreshHash] = s
	return nil
}
func (m *sessionMemory) Rotate(_ context.Context, old, next string, now time.Time) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.byHash[old]
	if !ok || !now.Before(s.ExpiresAt) {
		return 0, ErrInvalid
	}
	delete(m.byHash, old)
	s.RefreshHash = next
	m.byHash[next] = s
	return s.UserID, nil
}
func (m *sessionMemory) Revoke(_ context.Context, hash string, now time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.byHash[hash]
	if !ok || !now.Before(s.ExpiresAt) {
		return ErrInvalid
	}
	delete(m.byHash, hash)
	return nil
}
func TestRefreshRotationAndLogoutArePerSession(t *testing.T) {
	store := &sessionMemory{byHash: make(map[string]Session)}
	s, _, _ := setup(t, store)
	ctx := context.Background()
	first, err := s.Login(ctx, "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.Login(ctx, "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	updated, err := s.Refresh(ctx, first.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	if updated.RefreshToken == first.RefreshToken || updated.ExpiresIn != 900 {
		t.Fatal("refresh did not rotate")
	}
	if _, err = s.Refresh(ctx, first.RefreshToken); !errors.Is(err, ErrInvalid) {
		t.Fatal("old token accepted")
	}
	if err = s.Logout(ctx, updated.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Refresh(ctx, updated.RefreshToken); !errors.Is(err, ErrInvalid) {
		t.Fatal("revoked token accepted")
	}
	if _, err = s.Refresh(ctx, second.RefreshToken); err != nil {
		t.Fatal("other session affected", err)
	}
}
func TestConcurrentRefreshHasOneWinner(t *testing.T) {
	store := &sessionMemory{byHash: make(map[string]Session)}
	s, _, _ := setup(t, store)
	ctx := context.Background()
	first, err := s.Login(ctx, "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		go func() { _, err := s.Refresh(ctx, first.RefreshToken); results <- err }()
	}
	a, b := <-results, <-results
	if !((a == nil && errors.Is(b, ErrInvalid)) || (b == nil && errors.Is(a, ErrInvalid))) {
		t.Fatalf("unexpected results: %v, %v", a, b)
	}
}

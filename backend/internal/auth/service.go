package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

type Service struct {
	users     Users
	passwords Passwords
	tokens    *AccessTokens
	sessions  SessionCreator
	dummyHash string
	now       func() time.Time
}

func NewService(users Users, passwords Passwords, tokens *AccessTokens, sessions SessionCreator) (*Service, error) {
	if users == nil || tokens == nil {
		return nil, errors.New("users and access token service are required")
	}
	if err := validatePasswords(passwords); err != nil {
		return nil, err
	}
	// Spend the same password verification work for an unknown login.
	dummy, err := passwords.Hash("unused-dummy-password")
	if err != nil {
		return nil, err
	}
	return &Service{users: users, passwords: passwords, tokens: tokens, sessions: sessions, dummyHash: dummy, now: time.Now}, nil
}
func (s *Service) Authenticate(ctx context.Context, login, password string) (User, error) {
	if err := ValidateLogin(login); err != nil {
		return User{}, err
	}
	if password == "" {
		return User{}, ErrInvalid
	}
	user, err := s.users.ByLogin(ctx, login)
	if errors.Is(err, ErrNotFound) {
		s.passwords.Verify(s.dummyHash, password)
		return User{}, ErrCredentials
	}
	if err != nil {
		return User{}, err
	}
	if !s.passwords.Verify(user.PasswordHash, password) {
		return User{}, ErrCredentials
	}
	if !validUser(user) {
		return User{}, errors.New("invalid user data in database")
	}
	return user, nil
}
func (s *Service) Login(ctx context.Context, login, password string) (Tokens, error) {
	user, err := s.Authenticate(ctx, login, password)
	if err != nil {
		return Tokens{}, err
	}
	if s.sessions == nil {
		return Tokens{}, ErrUnavailable
	}
	access, err := s.tokens.Issue(user.ID)
	if err != nil {
		return Tokens{}, err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return Tokens{}, err
	}
	refresh := base64.RawURLEncoding.EncodeToString(raw)
	digest := sha256.Sum256([]byte(refresh))
	now := s.now()
	if err := s.sessions.CreateSession(ctx, Session{
		UserID: user.ID, RefreshHash: hex.EncodeToString(digest[:]),
		CreatedAt: now, ExpiresAt: now.AddDate(0, 6, 0),
	}); err != nil {
		return Tokens{}, err
	}
	return Tokens{AccessToken: access, RefreshToken: refresh, ExpiresIn: int(AccessTTL / time.Second)}, nil
}
func (s *Service) Authorize(ctx context.Context, raw string) (User, error) {
	id, err := s.tokens.Verify(raw)
	if err != nil {
		return User{}, ErrUnauthorized
	}
	user, err := s.users.ByID(ctx, id)
	if errors.Is(err, ErrNotFound) {
		return User{}, ErrUnauthorized
	}
	if err != nil {
		return User{}, err
	}
	// Role is read from the database, so a stale JWT cannot preserve old privileges.
	if !validUser(user) {
		return User{}, ErrUnauthorized
	}
	return user, nil
}
func (s *Service) CreateUser(ctx context.Context, login, password, fullName string, role Role) (User, error) {
	actor, ok := CurrentUser(ctx)
	if !ok {
		return User{}, ErrUnauthorized
	}
	if actor.Role != Admin {
		return User{}, ErrForbidden
	}
	if err := ValidateLogin(login); err != nil {
		return User{}, err
	}
	if strings.TrimSpace(fullName) == "" || !role.Valid() {
		return User{}, ErrInvalid
	}
	hash, err := s.passwords.Hash(password)
	if err != nil {
		return User{}, err
	}
	user, err := s.users.Create(ctx, actor.ID, NewUser{Login: login, FullName: fullName, Role: role, PasswordHash: hash})
	if err != nil {
		return User{}, err
	}
	if !validUser(user) {
		return User{}, errors.New("invalid created user")
	}
	return user, nil
}
func (s *Service) DeleteUser(ctx context.Context, id string) error {
	actor, ok := CurrentUser(ctx)
	if !ok {
		return ErrUnauthorized
	}
	if actor.Role != Admin {
		return ErrForbidden
	}
	target, err := ParseID(id)
	if err != nil {
		return err
	}
	if actor.ID == target {
		return ErrSelfDelete
	}
	return s.users.Delete(ctx, actor.ID, target)
}

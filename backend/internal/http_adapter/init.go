package http_adapter

import (
	"backend/internal/auth"
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"backend/internal/storage/postgres"
	"backend/internal/storage/sessions"
	"context"
	"errors"
	"os"
	"time"

	"github.com/spf13/viper"
)

type HttpAdapter struct {
	server   *server.Server
	users    *postgres.Users
	sessions *sessions.Store
}

func New() (*HttpAdapter, error) {
	var service *auth.Service
	var users *postgres.Users
	var store *sessions.Store
	url, secret, sessionURL := os.Getenv("DATABASE_URL"), os.Getenv("AUTH_JWT_SECRET"), os.Getenv("SESSION_DATABASE_URL")
	if url != "" || secret != "" || sessionURL != "" {
		if url == "" || secret == "" || sessionURL == "" {
			return nil, errors.New("DATABASE_URL, SESSION_DATABASE_URL and AUTH_JWT_SECRET must be configured together")
		}
		tokens, err := auth.NewAccessTokens(secret)
		if err != nil {
			return nil, err
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		users, err = postgres.Open(ctx, url)
		if err != nil {
			return nil, err
		}
		store, err = sessions.Open(ctx, sessionURL)
		if err != nil {
			users.Close()
			return nil, err
		}
		service, err = auth.NewService(users, auth.BcryptPasswords{}, tokens, store)
		if err != nil {
			store.Close()
			users.Close()
			return nil, err
		}
	}
	r, err := router.New(service)
	if err != nil {
		if store != nil {
			store.Close()
		}
		if users != nil {
			users.Close()
		}
		return nil, err
	}
	cfg := server.ServerConfig{Port: viper.GetString("port"), ShutdownTimeout: viper.GetDuration("shutdownTimeout")}
	s, err := server.New(cfg, r)
	if err != nil {
		if store != nil {
			store.Close()
		}
		if users != nil {
			users.Close()
		}
		return nil, err
	}
	return &HttpAdapter{server: s, users: users, sessions: store}, nil
}
func (a *HttpAdapter) Close() {
	if a.sessions != nil {
		a.sessions.Close()
	}
	if a.users != nil {
		a.users.Close()
	}
}
func (a *HttpAdapter) Start(ctx context.Context) error { return a.server.Start(ctx) }

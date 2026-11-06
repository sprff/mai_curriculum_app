package http_adapter

import (
	"backend/internal/auth"
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"backend/internal/storage/postgres"
	"context"
	"errors"
	"os"
	"time"

	"github.com/spf13/viper"
)

type HttpAdapter struct {
	server *server.Server
	users  *postgres.Users
}

func New() (*HttpAdapter, error) {
	var service *auth.Service
	var users *postgres.Users
	url, secret := os.Getenv("DATABASE_URL"), os.Getenv("AUTH_JWT_SECRET")
	if url != "" || secret != "" {
		if url == "" || secret == "" {
			return nil, errors.New("DATABASE_URL and AUTH_JWT_SECRET must be configured together")
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
		// Persistent session storage is intentionally not fabricated before schema agreement.
		service, err = auth.NewService(users, auth.BcryptPasswords{}, tokens, nil)
		if err != nil {
			users.Close()
			return nil, err
		}
	}
	r, err := router.New(service)
	if err != nil {
		if users != nil {
			users.Close()
		}
		return nil, err
	}
	cfg := server.ServerConfig{Port: viper.GetString("port"), ShutdownTimeout: viper.GetDuration("shutdownTimeout")}
	s, err := server.New(cfg, r)
	if err != nil {
		if users != nil {
			users.Close()
		}
		return nil, err
	}
	return &HttpAdapter{server: s, users: users}, nil
}
func (a *HttpAdapter) Close() {
	if a.users != nil {
		a.users.Close()
	}
}
func (a *HttpAdapter) Start(ctx context.Context) error { return a.server.Start(ctx) }

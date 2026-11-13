package http_adapter

import (
	"backend/internal/config"
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"context"
)

type HttpAdapter struct {
	server *server.Server
}

func New(cfg config.Config) (*HttpAdapter, error) {
	r, err := router.New()
	if err != nil {
		return nil, err
	}

	serverCfg := server.ServerConfig{
		Port:            cfg.Port,
		ShutdownTimeout: cfg.ShutdownTimeout,
	}

	s, err := server.New(serverCfg, r)
	if err != nil {
		return nil, err
	}

	return &HttpAdapter{
		server: s,
	}, nil
}

func (a HttpAdapter) Start(ctx context.Context) error {
	return a.server.Start(ctx)
}

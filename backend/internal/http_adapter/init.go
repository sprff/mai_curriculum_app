package http_adapter

import (
	"context"
	"time"

	"backend/internal/config"
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"backend/internal/service"
)

type HttpAdapter struct {
	server *server.Server
}

func New(cfg config.Config, services *service.Service) (*HttpAdapter, error) {
	coreTimeout := cfg.Core.Timeout
	if coreTimeout == 0 {
		coreTimeout = 10 * time.Second
	}

	r, err := router.New(services, config.Core{
		BaseURL: cfg.Core.BaseURL,
		Timeout: coreTimeout,
	})
	if err != nil {
		return nil, err
	}

	serverCfg := server.ServerConfig{
		Port:            cfg.Port,
		ShutdownTimeout: cfg.ShutdownTimeout,
		// Include data loading before the request to core.
		RequestTimeout: coreTimeout + 5*time.Second,
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

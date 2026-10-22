package http_adapter

import (
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"context"

	"github.com/spf13/viper"
)

type HttpAdapter struct {
	server *server.Server
}

func New() (*HttpAdapter, error) {
	r, err := router.New()
	if err != nil {
		return nil, err
	}

	serverCfg := server.ServerConfig{
		Port:            viper.GetString("port"),
		ShutdownTimeout: viper.GetDuration("shutdownTimeout"),
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

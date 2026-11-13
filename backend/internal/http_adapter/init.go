package http_adapter

import (
	"backend/internal/http_adapter/handlers"
	"backend/internal/http_adapter/router"
	"backend/internal/http_adapter/server"
	"backend/internal/service"
	"context"
	"time"

	"github.com/spf13/viper"
)

type HttpAdapter struct {
	server *server.Server
}

func New(services *service.Service) (*HttpAdapter, error) {
	coreTimeout := viper.GetDuration("core.timeout")
	if coreTimeout == 0 {
		coreTimeout = 10 * time.Second
	}

	r, err := router.New(services, handlers.CoreConfig{
		BaseURL: viper.GetString("core.baseURL"),
		Timeout: coreTimeout,
	})
	if err != nil {
		return nil, err
	}

	serverCfg := server.ServerConfig{
		Port:            viper.GetString("port"),
		ShutdownTimeout: viper.GetDuration("shutdownTimeout"),
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

package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"golang.org/x/sync/errgroup"
)

type Server struct {
	httpServer *http.Server
	config     ServerConfig
}

func New(cfg ServerConfig, handler http.Handler) (*Server, error) {
	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	if cfg.ShutdownTimeout == 0 {
		cfg.ShutdownTimeout = 10 * time.Second
	}

	httpServer := &http.Server{
		Addr:           ":" + cfg.Port,
		Handler:        handler,
		MaxHeaderBytes: 1 << 28,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}

	return &Server{
		httpServer: httpServer,
		config:     cfg,
	}, nil
}

func (s *Server) Start(ctx context.Context) error {
	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		<-gCtx.Done()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeout)
		defer shutdownCancel()

		err := s.httpServer.Shutdown(shutdownCtx)
		if err != nil {
			_ = s.httpServer.Close()
			if errors.Is(err, context.DeadlineExceeded) {
				return fmt.Errorf("server failed to stop gracefully within [%v], give up", s.config.ShutdownTimeout)
			}

			return err
		}

		return nil
	})

	g.Go(func() error {
		err := s.httpServer.ListenAndServe()
		if err != nil {
			if errors.Is(err, http.ErrServerClosed) {
				return nil
			}

			return err
		}

		return nil
	})

	err := g.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

type ServerConfig struct {
	Port            string
	ShutdownTimeout time.Duration
}

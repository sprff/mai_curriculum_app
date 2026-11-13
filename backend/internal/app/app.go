package app

import (
	"backend/internal/http_adapter"
	"backend/internal/repository"
	"backend/internal/service"
	"backend/pkg/postgres"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

func Run() error {
	logrus.Print("Initializing components...")

	db, err := postgres.NewPostgresDB(context.Background(), viper.GetString("database.dsn"))
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	services := service.NewService(repo)
	httpAdapter, err := http_adapter.New(services)
	if err != nil {
		return fmt.Errorf("initialize HTTP adapter: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	serverDone := make(chan error, 1)
	go func() {
		serverDone <- httpAdapter.Start(ctx)
	}()

	logrus.Print("App started.")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT, syscall.SIGTSTP)
	defer signal.Stop(quit)

	select {
	case sig := <-quit:
		logrus.Printf("Received %s, shutting down.", sig)
		cancel()
	case err := <-serverDone:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("run HTTP server: %w", err)
		}
		return nil
	}

	if err := <-serverDone; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shut down HTTP server: %w", err)
	}

	logrus.Print("App is stopped.")
	return nil
}

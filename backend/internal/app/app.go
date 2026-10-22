package app

import (
	"backend/internal/http_adapter"
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/sirupsen/logrus"
)

func Run() {
	logrus.Print("Initializing components...")

	httpAdapter, err := http_adapter.New()
	if err != nil {
		logrus.Fatal("error initializing http adapter")
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
			logrus.Fatalf("error occured while running http-server: %s", err.Error())
		}
		return
	}

	if err := <-serverDone; err != nil && !errors.Is(err, http.ErrServerClosed) {
		logrus.Errorf("error while shutting down http-server: %s", err.Error())
	}

	logrus.Print("App is stopped.")
}

package main

import (
	"backend/internal/app"
	"backend/internal/config"

	"github.com/sirupsen/logrus"
)

func main() {
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.Print("Initializing configs...")

	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		logrus.Fatalf("Error initializing configs: %s", err.Error())
	}

	app.Run(cfg)
}

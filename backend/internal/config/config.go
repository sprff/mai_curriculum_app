package config

import (
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	Port            string        `yaml:"port"`
	ShutdownTimeout time.Duration `yaml:"shutdownTimeout"`
	PostgreSQL      PostgreSQL    `yaml:"postgresql"`
}

type PostgreSQL struct {
	Host           string        `yaml:"host" `
	Port           int           `yaml:"port" `
	Database       string        `yaml:"database"`
	User           string        `yaml:"user"`
	Password       string        `yaml:"-" env:"PG_PASSWORD"`
	SSLMode        string        `yaml:"sslMode"`
	ConnectTimeout time.Duration `yaml:"connectTimeout"`
}

func Load(path string) (Config, error) {
	var cfg Config
	if err := cleanenv.ReadConfig(path, &cfg); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

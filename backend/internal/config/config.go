package config

import (
	"net"
	"net/url"
	"strconv"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	Port            string        `yaml:"port"`
	ShutdownTimeout time.Duration `yaml:"shutdownTimeout"`
	PostgreSQL      PostgreSQL    `yaml:"postgresql"`
	Core            Core          `yaml:"core"`
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

type Core struct {
	BaseURL string        `yaml:"baseURL"`
	Timeout time.Duration `yaml:"timeout"`
}

func (cfg PostgreSQL) DSN() string {
	address := &url.URL{
		Scheme: "postgres",
		Host:   net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
		Path:   "/" + cfg.Database,
		User:   url.UserPassword(cfg.User, cfg.Password),
	}
	query := address.Query()
	query.Set("sslmode", cfg.SSLMode)
	if cfg.ConnectTimeout > 0 {
		seconds := int64((cfg.ConnectTimeout + time.Second - 1) / time.Second)
		query.Set("connect_timeout", strconv.FormatInt(seconds, 10))
	}
	address.RawQuery = query.Encode()
	return address.String()
}

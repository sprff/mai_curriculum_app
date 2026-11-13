package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"backend/internal/service"
)

type CoreConfig struct {
	BaseURL string
	Timeout time.Duration
}

type Handler struct {
	services   *service.Service
	coreURL    string
	httpClient *http.Client
}

func New(services *service.Service, cfg CoreConfig) (*Handler, error) {
	coreURL, err := url.Parse(cfg.BaseURL)
	if err != nil {
		return nil, errors.New("invalid core base URL")
	}
	if coreURL.Scheme != "http" && coreURL.Scheme != "https" {
		return nil, errors.New("core base URL must use HTTP or HTTPS")
	}
	if coreURL.Hostname() == "" || coreURL.User != nil || coreURL.RawQuery != "" || coreURL.Fragment != "" {
		return nil, errors.New("core base URL must contain a host and no credentials, query or fragment")
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 10 * time.Second
	}
	if cfg.Timeout < 0 {
		return nil, errors.New("core timeout must be positive")
	}

	return &Handler{
		services: services,
		coreURL:  strings.TrimRight(coreURL.String(), "/"),
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}, nil
}

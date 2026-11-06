package http_adapter

import (
	"strings"
	"testing"
)

func TestAuthConfiguration(t *testing.T) {
	for _, tc := range []struct{ name, url, secret string }{
		{"missing secret", "postgres://example.invalid/database", ""},
		{"missing database", "", strings.Repeat("s", 32)},
		{"weak secret", "postgres://example.invalid/database", "short"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("DATABASE_URL", tc.url)
			t.Setenv("AUTH_JWT_SECRET", tc.secret)
			if _, err := New(); err == nil {
				t.Fatal("invalid auth configuration accepted")
			}
		})
	}
}
func TestHealthModeNeedsNoDatabase(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("AUTH_JWT_SECRET", "")
	adapter, err := New()
	if err != nil {
		t.Fatal(err)
	}
	adapter.Close()
}

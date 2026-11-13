package router

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPing(t *testing.T) {
	handler, err := New()
	if err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/ping", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d; body = %s", response.Code, response.Body.String())
	}
	var pong string
	if err := json.Unmarshal(response.Body.Bytes(), &pong); err != nil {
		t.Fatal(err)
	}
	if pong != "pong" {
		t.Fatalf("response = %q", pong)
	}
}

func TestRequestErrors(t *testing.T) {
	handler, err := New()
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		name, method, path, body, token string
		status                          int
		code                            string
	}{
		{"missing token", "GET", "/api/v1/auth/me", "", "", 401, "UNAUTHORIZED"},
		{"unverified token", "GET", "/api/v1/auth/me", "", "fake-token", 401, "UNAUTHORIZED"},
		{"malformed login JSON", "POST", "/api/v1/auth/login", "{", "", 400, "INVALID_REQUEST"},
		{"missing password", "POST", "/api/v1/auth/login", `{"login":"student"}`, "", 400, "INVALID_REQUEST"},
		{"login dependency missing", "POST", "/api/v1/auth/login", `{"login":"student","password":"example"}`, "", 503, "AUTH_UNAVAILABLE"},
		{"logout needs no bearer", "POST", "/api/v1/auth/logout", `{"refresh_token":"example"}`, "", 503, "AUTH_UNAVAILABLE"},
		{"refresh needs no bearer", "POST", "/api/v1/auth/refresh", `{"refresh_token":"example"}`, "", 503, "AUTH_UNAVAILABLE"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			if test.body != "" {
				request.Header.Set("Content-Type", "application/json")
			}
			if test.token != "" {
				request.Header.Set("Authorization", "Bearer "+test.token)
			}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != test.status {
				t.Fatalf("status = %d, want %d; body = %s", response.Code, test.status, response.Body.String())
			}
			var body map[string]json.RawMessage
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if len(body) != 2 || body["code"] == nil || body["message"] == nil {
				t.Fatalf("unexpected error format: %s", response.Body.String())
			}
			var code, message string
			if err := json.Unmarshal(body["code"], &code); err != nil {
				t.Fatal(err)
			}
			if err := json.Unmarshal(body["message"], &message); err != nil {
				t.Fatal(err)
			}
			if code != test.code || message == "" {
				t.Fatalf("unexpected error: %s", response.Body.String())
			}
		})
	}
}

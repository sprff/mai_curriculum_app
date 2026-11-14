package router

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backend/internal/http_adapter/handlers"
	"backend/internal/model"
	"backend/internal/service"
)

type mergeGeneration struct{}

func (mergeGeneration) GetGenerationRequest(context.Context) (model.GenerationRequest, error) {
	return model.GenerationRequest{}, nil
}

func TestMergedRoutes(t *testing.T) {
	core := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, r.Body)
		if r.Method != http.MethodPost || r.URL.Path != "/jobs" {
			t.Errorf("unexpected core request: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusAccepted)
		_, _ = io.WriteString(w, `{"job_id":"merge-test"}`)
	}))
	defer core.Close()
	router, err := New(&service.Service{Generation: mergeGeneration{}}, handlers.CoreConfig{BaseURL: core.URL})
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		method, path, body string
		status             int
	}{
		{http.MethodGet, "/api/v1/ping", "", http.StatusOK},
		{http.MethodPost, "/api/v1/jobs", "", http.StatusAccepted},
		// Main's public auth stub remains reachable through the generated router.
		{http.MethodPost, "/api/v1/auth/login", `{"login":"test","password":"test"}`, http.StatusNotImplemented},
	} {
		w := httptest.NewRecorder()
		request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
		if test.body != "" {
			request.Header.Set("Content-Type", "application/json")
		}
		router.ServeHTTP(w, request)
		if w.Code != test.status {
			t.Fatalf("%s: status=%d body=%s", test.path, w.Code, w.Body.String())
		}
	}
}

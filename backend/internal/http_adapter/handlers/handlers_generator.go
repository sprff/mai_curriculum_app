package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	api "backend/internal/http_adapter/router/generated"
)

func (h *Handler) CreateGenerationJob(ctx context.Context) (api.CreateGenerationJobRes, error) {
	request, err := h.services.GetGenerationRequest(ctx)
	if err != nil {
		return &api.CreateGenerationJobInternalServerError{Errors: []api.ErrorItem{{Message: "error loading generation data"}}}, nil
	}

	status, data, err := h.requestCore(ctx, http.MethodPost, "/jobs", request)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return &api.CreateGenerationJobGatewayTimeout{Errors: []api.ErrorItem{{Message: "core request timed out"}}}, nil
		}
		return &api.CreateGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "error communicating with core"}}}, nil
	}

	switch status {
	case http.StatusAccepted:
		var result api.JobCreated
		if err := json.Unmarshal(data, &result); err != nil || result.JobID == "" {
			return &api.CreateGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid job response from core"}}}, nil
		}
		return &result, nil
	case http.StatusUnprocessableEntity:
		var result api.ValidationIssues
		if err := json.Unmarshal(data, &result); err != nil {
			return &api.CreateGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid validation response from core"}}}, nil
		}
		return &result, nil
	default:
		return &api.CreateGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "unexpected response from core"}}}, nil
	}
}

func (h *Handler) GetGenerationJob(ctx context.Context, params api.GetGenerationJobParams) (api.GetGenerationJobRes, error) {
	id := params.JobID
	if strings.TrimSpace(id) == "" || id == "." || id == ".." {
		return &api.GetGenerationJobBadRequest{Errors: []api.ErrorItem{{Message: "invalid job ID"}}}, nil
	}

	status, data, err := h.requestCore(ctx, http.MethodGet, "/jobs/"+url.PathEscape(id), nil)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return &api.GetGenerationJobGatewayTimeout{Errors: []api.ErrorItem{{Message: "core request timed out"}}}, nil
		}
		return &api.GetGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "error communicating with core"}}}, nil
	}

	switch status {
	case http.StatusOK:
		var result api.JobState
		if err := json.Unmarshal(data, &result); err != nil {
			return &api.GetGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid job response from core"}}}, nil
		}
		return &result, nil
	case http.StatusNotFound:
		return &api.GetGenerationJobNotFound{}, nil
	case http.StatusUnprocessableEntity:
		var result api.HTTPValidationError
		if err := json.Unmarshal(data, &result); err != nil {
			return &api.GetGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid validation response from core"}}}, nil
		}
		return &result, nil
	default:
		return &api.GetGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "unexpected response from core"}}}, nil
	}
}

func (h *Handler) CancelGenerationJob(ctx context.Context, params api.CancelGenerationJobParams) (api.CancelGenerationJobRes, error) {
	id := params.JobID
	if strings.TrimSpace(id) == "" || id == "." || id == ".." {
		return &api.CancelGenerationJobBadRequest{Errors: []api.ErrorItem{{Message: "invalid job ID"}}}, nil
	}

	status, data, err := h.requestCore(ctx, http.MethodPost, "/jobs/"+url.PathEscape(id)+"/cancel", nil)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return &api.CancelGenerationJobGatewayTimeout{Errors: []api.ErrorItem{{Message: "core request timed out"}}}, nil
		}
		return &api.CancelGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "error communicating with core"}}}, nil
	}

	switch status {
	case http.StatusOK:
		var result api.JobState
		if err := json.Unmarshal(data, &result); err != nil {
			return &api.CancelGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid job response from core"}}}, nil
		}
		return &result, nil
	case http.StatusNotFound:
		return &api.CancelGenerationJobNotFound{}, nil
	case http.StatusUnprocessableEntity:
		var result api.HTTPValidationError
		if err := json.Unmarshal(data, &result); err != nil {
			return &api.CancelGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "invalid validation response from core"}}}, nil
		}
		return &result, nil
	default:
		return &api.CancelGenerationJobBadGateway{Errors: []api.ErrorItem{{Message: "unexpected response from core"}}}, nil
	}
}

func (h *Handler) requestCore(ctx context.Context, method, path string, payload any) (int, json.RawMessage, error) {
	var body io.Reader

	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return 0, nil, fmt.Errorf("encode core request: %w", err)
		}

		body = bytes.NewReader(data)
	}

	request, err := http.NewRequestWithContext(ctx, method, h.coreURL+path, body)
	if err != nil {
		return 0, nil, fmt.Errorf("build core request: %w", err)
	}

	request.Header.Set("Accept", "application/json")

	if payload != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := h.httpClient.Do(request)
	if err != nil {
		return 0, nil, fmt.Errorf("call core: %w", err)
	}
	defer response.Body.Close()

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return 0, nil, fmt.Errorf("read core response: %w", err)
	}

	if len(data) == 0 && response.StatusCode == http.StatusNotFound {
		return response.StatusCode, nil, nil
	}

	if !json.Valid(data) {
		return 0, nil, errors.New("invalid JSON response from core")
	}

	return response.StatusCode, data, nil
}

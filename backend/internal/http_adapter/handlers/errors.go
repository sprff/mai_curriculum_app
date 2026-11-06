package handlers

import (
	"context"
	"errors"
	"net/http"

	api "backend/internal/http_adapter/router/generated"
)

type codedError struct {
	code int
	err  error
}

func (e *codedError) Error() string { return e.err.Error() }

func (e *codedError) Unwrap() error { return e.err }

func apiErr(code int, err error) error { //nolint:unused // должно быть по правилам ogen
	return &codedError{code: code, err: err}
}

func (h *Handler) NewError(_ context.Context, err error) *api.ErrorsResponseStatusCode {
	code := http.StatusInternalServerError

	if ce, ok := errors.AsType[*codedError](err); ok {
		code = ce.code
	}

	return &api.ErrorsResponseStatusCode{
		StatusCode: code,
		Response: api.ErrorsResponse{
			Errors: []api.ErrorItem{
				{Message: err.Error()},
			},
		},
	}
}

package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	api "backend/internal/http_adapter/router/generated"
	"backend/internal/model"

	"github.com/ogen-go/ogen/ogenerrors"
	"github.com/sirupsen/logrus"
)

type codedError struct {
	code int
	err  error
}

func (e *codedError) Error() string { return e.err.Error() }

func (e *codedError) Unwrap() error { return e.err }

func apiErr(code int, err error) error {
	return &codedError{code: code, err: err}
}

func (h *Handler) NewError(ctx context.Context, err error) *api.UnexpectedErrorStatusCode {
	code := http.StatusInternalServerError
	message := "internal server error"

	if ce, ok := errors.AsType[*codedError](err); ok {
		code = ce.code
	} else {
		var ogenErr ogenerrors.Error
		switch {
		case errors.Is(err, model.ErrInvalidInput):
			code = http.StatusBadRequest
		case errors.Is(err, model.ErrNotFound):
			code = http.StatusNotFound
		case errors.Is(err, model.ErrConflict):
			code = http.StatusConflict
		case errors.As(err, &ogenErr):
			code = ogenErr.Code()
		}
	}
	if code >= http.StatusInternalServerError {
		logrus.WithContext(ctx).WithError(err).Error("HTTP handler failed")
	} else {
		message = err.Error()
	}

	return &api.UnexpectedErrorStatusCode{
		StatusCode: code,
		Response: api.Error{
			Code:    strconv.Itoa(code),
			Message: message,
		},
	}
}

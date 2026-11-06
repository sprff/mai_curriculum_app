package router

import (
	"backend/internal/auth"
	"backend/internal/http_adapter/handlers"
	"backend/internal/http_adapter/router/generated"
	"context"
	"encoding/json"
	"errors"
	"net/http"

	ht "github.com/ogen-go/ogen/http"
	"github.com/ogen-go/ogen/ogenerrors"
	"github.com/ogen-go/ogen/validate"
)

func New(services ...*auth.Service) (http.Handler, error) {
	h := handlers.New(services...)
	return generated.NewServer(
		h,
		h,
		generated.WithPathPrefix("/api/v1"),
		generated.WithErrorHandler(errorHandler),
	)
}

func errorHandler(_ context.Context, w http.ResponseWriter, _ *http.Request, err error) {
	status := errorCode(err)
	code := "INTERNAL_ERROR"
	switch status {
	case http.StatusBadRequest:
		code = "INVALID_REQUEST"
	case http.StatusUnauthorized:
		code = "UNAUTHORIZED"
	case http.StatusForbidden:
		code = "FORBIDDEN"
	case http.StatusNotFound:
		code = "NOT_FOUND"
	case http.StatusConflict:
		code = "CONFLICT"
	case http.StatusUnsupportedMediaType:
		code = "UNSUPPORTED_MEDIA_TYPE"
	case http.StatusServiceUnavailable:
		code = "AUTH_UNAVAILABLE"
	case http.StatusNotImplemented:
		code = "NOT_IMPLEMENTED"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(generated.Error{
		Code:    code,
		Message: http.StatusText(status),
	})
}

func errorCode(err error) int {
	var (
		ctErr   *validate.InvalidContentTypeError
		ogenErr ogenerrors.Error
	)
	switch {
	case errors.Is(err, auth.ErrUnavailable):
		return http.StatusServiceUnavailable
	case errors.Is(err, ht.ErrNotImplemented):
		return http.StatusNotImplemented
	case errors.As(err, &ctErr):
		return http.StatusUnsupportedMediaType
	case errors.As(err, &ogenErr):
		return ogenErr.Code()
	default:
		return http.StatusInternalServerError
	}
}

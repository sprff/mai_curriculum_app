package router

import (
	"backend/internal/http_adapter/handlers"
	"backend/internal/http_adapter/router/generated"
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	ht "github.com/ogen-go/ogen/http"
	"github.com/ogen-go/ogen/ogenerrors"
	"github.com/ogen-go/ogen/validate"
)

func New() (http.Handler, error) {
	h := handlers.New()

	openapiRouter, err := generated.NewServer(
		h,
		generated.WithErrorHandler(errorHandler),
	)
	if err != nil {
		return nil, err
	}

	router := http.NewServeMux()
	router.Handle("/", openapiRouter)

	return router, nil
}

func errorHandler(_ context.Context, w http.ResponseWriter, _ *http.Request, err error) {
	w.Header().Set("Content-Type", "application/json")

	code := errorCode(err)
	w.WriteHeader(code)

	resp := generated.ErrorsResponse{
		Errors: []generated.ErrorItem{
			{
				Message: err.Error(),
			},
		},
	}

	encoder := json.NewEncoder(w)
	encoder.SetIndent(" ", " ")

	err = encoder.Encode(resp)
	if err != nil {
		log.Printf("error encoding response: %v", err)
	}
}

func errorCode(err error) (code int) {
	var (
		ctErr   *validate.InvalidContentTypeError
		ogenErr ogenerrors.Error
	)

	switch {
	case errors.Is(err, ht.ErrNotImplemented):
		code = http.StatusNotImplemented
	case errors.As(err, &ctErr):
		code = http.StatusUnsupportedMediaType
	case errors.As(err, &ogenErr):
		code = ogenErr.Code()
	default:
		code = http.StatusInternalServerError
	}

	return code
}

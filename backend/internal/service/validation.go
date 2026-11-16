package service

import (
	"fmt"
	"math"
	"strings"
	"unicode/utf8"

	"backend/internal/model"
)

func invalidInput(message string) error {
	return fmt.Errorf("%w: %s", model.ErrInvalidInput, message)
}

func validateIDs(ids ...int64) error {
	for _, id := range ids {
		if id <= 0 {
			return invalidInput("IDs must be positive")
		}
	}
	return nil
}

func validateText(value, field string) error {
	if value == "" || !utf8.ValidString(value) || strings.ContainsRune(value, 0) {
		return invalidInput(field + " must be nonempty UTF-8 text without NUL characters")
	}
	return nil
}

func pagination(page, perPage int) (limit, offset int64, err error) {
	if page < 1 || perPage < 1 || perPage > 100 {
		return 0, 0, invalidInput("page must be positive and per_page must be between 1 and 100")
	}
	if int64(page-1) > math.MaxInt64/int64(perPage) {
		return 0, 0, invalidInput("page is too large")
	}
	return int64(perPage), int64(page-1) * int64(perPage), nil
}

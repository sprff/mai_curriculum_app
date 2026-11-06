package auth

import "errors"

var ErrInvalidLogin = errors.New("invalid login format")

// ValidateLogin preserves case and whitespace: input is checked, never normalized.
func ValidateLogin(login string) error {
	if len(login) < 3 || len(login) > 32 {
		return ErrInvalidLogin
	}
	for i := 0; i < len(login); i++ {
		c := login[i]
		if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' ||
			c >= '0' && c <= '9' || c == '.' || c == '-' || c == '_' {
			continue
		}
		return ErrInvalidLogin
	}
	return nil
}

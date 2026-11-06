package auth

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
)

// Passwords can be replaced if the existing database uses another agreed hash format.
type Passwords interface {
	Hash(string) (string, error)
	Verify(hash, password string) bool
}
type BcryptPasswords struct{}

func (BcryptPasswords) Hash(password string) (string, error) {
	if password == "" || len(password) > 72 {
		return "", ErrInvalid
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}
func (BcryptPasswords) Verify(hash, password string) bool {
	if password == "" || len(password) > 72 {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
func validatePasswords(p Passwords) error {
	if p == nil {
		return errors.New("password verifier is required")
	}
	return nil
}

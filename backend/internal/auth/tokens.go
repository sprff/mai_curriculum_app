package auth

import (
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

const AccessTTL = 15 * time.Minute
const tokenIssuer = "mai-curriculum"
const tokenAudience = "mai-curriculum-api"

type AccessTokens struct {
	key []byte
	now func() time.Time
}

func NewAccessTokens(secret string) (*AccessTokens, error) {
	if len(secret) < 32 {
		return nil, errors.New("AUTH_JWT_SECRET must contain at least 32 bytes")
	}
	return &AccessTokens{key: []byte(secret), now: time.Now}, nil
}
func (a *AccessTokens) Issue(userID int64) (string, error) {
	if userID <= 0 || userID > 2147483647 {
		return "", ErrInvalid
	}
	now := a.now()
	claims := jwt.RegisteredClaims{
		Subject:   (User{ID: userID}).PublicID(),
		Issuer:    tokenIssuer,
		Audience:  jwt.ClaimStrings{tokenAudience},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(AccessTTL)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(a.key)
}
func (a *AccessTokens) Verify(raw string) (int64, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(raw, claims,
		func(_ *jwt.Token) (any, error) { return a.key, nil },
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(tokenIssuer),
		jwt.WithAudience(tokenAudience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithTimeFunc(a.now),
	)
	if err != nil || !token.Valid || claims.IssuedAt == nil {
		return 0, ErrUnauthorized
	}
	id, err := ParseID(claims.Subject)
	if err != nil {
		return 0, ErrUnauthorized
	}
	return id, nil
}

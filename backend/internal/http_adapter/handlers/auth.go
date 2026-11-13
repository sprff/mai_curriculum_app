package handlers

import (
	"backend/internal/auth"
	api "backend/internal/http_adapter/router/generated"
	"context"
	"errors"
)

func publicUser(user auth.User) *api.UserPublicInfo {
	return &api.UserPublicInfo{ID: user.PublicID(), Login: user.Login, FullName: user.FullName, Role: api.UserRoleEnum(user.Role)}
}
func (h *Handler) AuthLogin(ctx context.Context, req *api.LoginRequest) (api.AuthLoginRes, error) {
	if err := auth.ValidateLogin(req.Login); err != nil {
		return &api.AuthLoginBadRequest{Code: "INVALID_LOGIN", Message: "Login must be 3-32 Latin letters, digits, dots, hyphens or underscores"}, nil
	}
	if h.service == nil {
		return nil, auth.ErrUnavailable
	}
	tokens, err := h.service.Login(ctx, req.Login, req.Password)
	switch {
	case errors.Is(err, auth.ErrInvalidLogin):
		return &api.AuthLoginBadRequest{Code: "INVALID_LOGIN", Message: "Login must be 3-32 Latin letters, digits, dots, hyphens or underscores"}, nil
	case errors.Is(err, auth.ErrInvalid):
		return &api.AuthLoginBadRequest{Code: "INVALID_REQUEST", Message: "Login and password are required"}, nil
	case errors.Is(err, auth.ErrCredentials):
		return &api.AuthLoginNotFound{Code: "INVALID_CREDENTIALS", Message: "Invalid login or password"}, nil
	case err != nil:
		return nil, err
	}
	return &api.AuthTokensInfo{AccessToken: tokens.AccessToken, RefreshToken: tokens.RefreshToken, ExpiresIn: tokens.ExpiresIn}, nil
}
func (h *Handler) AuthMe(ctx context.Context) (api.AuthMeRes, error) {
	user, ok := auth.CurrentUser(ctx)
	if !ok {
		return &api.Error{Code: "UNAUTHORIZED", Message: "Authentication required"}, nil
	}
	return publicUser(user), nil
}
func (h *Handler) CreateUser(ctx context.Context, req *api.CreateUserRequest) (api.CreateUserRes, error) {
	if h.service == nil {
		return nil, auth.ErrUnavailable
	}
	user, err := h.service.CreateUser(ctx, req.Login, req.Password, req.FullName, auth.Role(req.Role))
	switch {
	case errors.Is(err, auth.ErrUnauthorized):
		return &api.CreateUserUnauthorized{Code: "UNAUTHORIZED", Message: "Authentication required"}, nil
	case errors.Is(err, auth.ErrForbidden):
		return &api.CreateUserForbidden{Code: "FORBIDDEN", Message: "Administrator role required"}, nil
	case errors.Is(err, auth.ErrInvalidLogin):
		return &api.CreateUserBadRequest{Code: "INVALID_LOGIN", Message: "Login must be 3-32 Latin letters, digits, dots, hyphens or underscores"}, nil
	case errors.Is(err, auth.ErrInvalid):
		return &api.CreateUserBadRequest{Code: "INVALID_REQUEST", Message: "Invalid account details; bcrypt passwords must be 1 to 72 bytes"}, nil
	case errors.Is(err, auth.ErrConflict):
		return &api.CreateUserConflict{Code: "LOGIN_EXISTS", Message: "Login already exists"}, nil
	case err != nil:
		return nil, err
	}
	return publicUser(user), nil
}
func (h *Handler) DeleteUser(ctx context.Context, params api.DeleteUserParams) (api.DeleteUserRes, error) {
	if h.service == nil {
		return nil, auth.ErrUnavailable
	}
	err := h.service.DeleteUser(ctx, params.ID)
	switch {
	case errors.Is(err, auth.ErrUnauthorized):
		return &api.DeleteUserUnauthorized{Code: "UNAUTHORIZED", Message: "Authentication required"}, nil
	case errors.Is(err, auth.ErrSelfDelete):
		return &api.DeleteUserForbidden{Code: "SELF_DELETE_FORBIDDEN", Message: "Cannot delete current user"}, nil
	case errors.Is(err, auth.ErrLastAdmin):
		return &api.DeleteUserForbidden{Code: "LAST_ADMIN", Message: "Cannot delete last administrator"}, nil
	case errors.Is(err, auth.ErrForbidden):
		return &api.DeleteUserForbidden{Code: "FORBIDDEN", Message: "Administrator role required"}, nil
	case errors.Is(err, auth.ErrReferenced):
		return &api.DeleteUserForbidden{Code: "USER_IN_USE", Message: "User is referenced by other records"}, nil
	case errors.Is(err, auth.ErrNotFound):
		return &api.DeleteUserNotFound{Code: "USER_NOT_FOUND", Message: "User not found"}, nil
	case err != nil:
		return nil, err
	}
	return &api.DeleteUserOK{}, nil
}

func (h *Handler) AuthRefresh(ctx context.Context, req *api.RefreshTokenRequest) (api.AuthRefreshRes, error) {
	if h.service == nil {
		return nil, auth.ErrUnavailable
	}
	result, err := h.service.Refresh(ctx, req.RefreshToken)
	if errors.Is(err, auth.ErrInvalid) {
		return &api.Error{Code: "INVALID_REFRESH_TOKEN", Message: "Invalid or expired refresh token"}, nil
	}
	if err != nil {
		return nil, err
	}
	return &api.AuthTokensInfo{AccessToken: result.AccessToken, RefreshToken: result.RefreshToken, ExpiresIn: result.ExpiresIn}, nil
}
func (h *Handler) AuthLogout(ctx context.Context, req *api.RefreshTokenRequest) (api.AuthLogoutRes, error) {
	if h.service == nil {
		return nil, auth.ErrUnavailable
	}
	err := h.service.Logout(ctx, req.RefreshToken)
	if errors.Is(err, auth.ErrInvalid) {
		return &api.Error{Code: "INVALID_REFRESH_TOKEN", Message: "Invalid or expired refresh token"}, nil
	}
	if err != nil {
		return nil, err
	}
	return &api.AuthLogoutNoContent{}, nil
}

package controller

import (
	"net/http"
)

type Auth struct {
}
type GetCurrentUserResponse struct {
	Id           int                     `json:"id"`
	Email        string                  `json:"email"`
	Username     string                  `json:"username"`
	Picture      string                  `json:"picture"`
	Created_at   string                  `json:"created_at"`
	Updated_at   string                  `json:"updated_at"`
	Has_password bool                    `json:"has_password"`
	Connections  []UserConnection        `json:"connections"`
	Niconico     UserConnection_NicoNico `json:"niconico"`
}

type UserConnection struct {
	Provider          string `json:"provider"`
	Provider_email    string `json:"provider_email"`
	Provider_username string `json:"provider_username"`
	Connected_at      string `json:"connected_at"`
}
type UserConnection_NicoNico struct {
	Connected     bool   `json:"connected"`
	Nico_user_id  string `json:"nico_user_id"`
	Nico_username string `json:"nico_username"`
	Nico_picture  string `json:"nico_picture"`
	Connected_at  string `json:"connected_at"`
}

type UnicornSSOAssertionResponse struct {
	Assertion string `json:"assertion"`
}

func (Auth) GetCurrentUser() GetCurrentUserResponse {
	var result GetCurrentUserResponse
	apiRequest(&result, http.MethodGet, "/auth/user")
	return result
}

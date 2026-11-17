package controller

import (
	"net/http"
	"net/url"
)

type Streams struct{ s *session }

type StreamAccount struct {
	Id        string  `json:"id"`
	UserId    int     `json:"user_id"`
	Name      string  `json:"name"`
	Platform  string  `json:"platform"`
	RtmpUrl   string  `json:"rtmp_url"`
	StreamKey string  `json:"stream_key"`
	IsActive  bool    `json:"is_active"`
	Status    string  `json:"status"`
	StartedAt *string `json:"started_at"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type ListStreamAccountsResponse []StreamAccount
type GetStreamAccountResponse = StreamAccount
type CreateStreamAccountResponse = StreamAccount
type UpdateStreamAccountResponse = StreamAccount

type CreateStreamAccountRequest struct {
	Name      string `json:"name"`
	Platform  string `json:"platform"`
	RtmpUrl   string `json:"rtmp_url"`
	StreamKey string `json:"stream_key"`
}

type UpdateStreamAccountRequest struct {
	Name      string `json:"name"`
	RtmpUrl   string `json:"rtmp_url"`
	StreamKey string `json:"stream_key"`
	IsActive  bool   `json:"is_active"`
}

type DeleteStreamAccountResponse struct {
	Status string `json:"status"`
}

func (ctl Streams) ListStreamAccounts() ListStreamAccountsResponse {
	var result ListStreamAccountsResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/streams")
	return result
}

func (ctl Streams) GetStreamAccount(id string) GetStreamAccountResponse {
	var result GetStreamAccountResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/streams/get?id="+url.QueryEscape(id))
	return result
}

func (ctl Streams) CreateStreamAccount(request CreateStreamAccountRequest) CreateStreamAccountResponse {
	var result CreateStreamAccountResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/streams", request)
	return result
}

func (ctl Streams) UpdateStreamAccount(id string, request UpdateStreamAccountRequest) UpdateStreamAccountResponse {
	var result UpdateStreamAccountResponse
	ctl.s.apiRequest(&result, http.MethodPatch, "/streams/update?id="+url.QueryEscape(id), request)
	return result
}

func (ctl Streams) DeleteStreamAccount(id string) DeleteStreamAccountResponse {
	var result DeleteStreamAccountResponse
	ctl.s.apiRequest(&result, http.MethodDelete, "/streams?id="+url.QueryEscape(id))
	return result
}

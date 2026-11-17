package controller

import (
	"net/http"
	"net/url"
	"strconv"
)

type DeviceCredentials struct{ s *session }

type DeviceCredentialMetadata struct {
	HostIp string `json:"host_ip"`
	Port   int    `json:"port"`
	Region string `json:"region"`
}

type DeviceCredentialSummary struct {
	Id           int                      `json:"id"`
	BrandName    string                   `json:"brand_name"`
	DeviceName   string                   `json:"device_name"`
	DeviceModel  string                   `json:"device_model"`
	IsActive     bool                     `json:"is_active"`
	CreatedAt    string                   `json:"created_at"`
	UpdatedAt    string                   `json:"updated_at"`
	LastTestedAt string                   `json:"last_tested_at"`
	Metadata     DeviceCredentialMetadata `json:"metadata"`
}

type DeviceCredential struct {
	Id           int     `json:"id"`
	BrandName    string  `json:"brand_name"`
	DeviceName   string  `json:"device_name"`
	DeviceModel  string  `json:"device_model"`
	IsActive     bool    `json:"is_active"`
	ApiKey       string  `json:"api_key"`
	DeviceId     string  `json:"device_id"`
	HostIp       string  `json:"host_ip"`
	Port         int     `json:"port"`
	Region       string  `json:"region"`
	LastTestedAt string  `json:"last_tested_at"`
	LastError    *string `json:"last_error"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type ListCredentialsResponse []DeviceCredentialSummary
type GetCredentialResponse = DeviceCredential
type CreateCredentialResponse = DeviceCredential
type UpdateCredentialResponse = DeviceCredential

type CreateCredentialRequest struct {
	BrandName   string `json:"brand_name"`
	ApiKey      string `json:"api_key"`
	DeviceId    string `json:"device_id"`
	DeviceName  string `json:"device_name"`
	DeviceModel string `json:"device_model"`
	HostIp      string `json:"host_ip"`
	Port        int    `json:"port"`
	Region      string `json:"region"`
}

type UpdateCredentialRequest struct {
	ApiKey     string `json:"api_key"`
	DeviceName string `json:"device_name"`
	IsActive   bool   `json:"is_active"`
}

type DeleteCredentialResponse struct {
	Status string `json:"status"`
}

func (ctl DeviceCredentials) ListCredentials() ListCredentialsResponse {
	var result ListCredentialsResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/device-credentials")
	return result
}

func (ctl DeviceCredentials) GetCredential(id int) GetCredentialResponse {
	var result GetCredentialResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/device-credentials/get?id="+url.QueryEscape(strconv.Itoa(id)))
	return result
}

func (ctl DeviceCredentials) CreateCredential(request CreateCredentialRequest) CreateCredentialResponse {
	var result CreateCredentialResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/device-credentials", request)
	return result
}

func (ctl DeviceCredentials) UpdateCredential(id int, request UpdateCredentialRequest) UpdateCredentialResponse {
	var result UpdateCredentialResponse
	ctl.s.apiRequest(&result, http.MethodPatch, "/device-credentials/update?id="+url.QueryEscape(strconv.Itoa(id)), request)
	return result
}

func (ctl DeviceCredentials) DeleteCredential(id int) DeleteCredentialResponse {
	var result DeleteCredentialResponse
	ctl.s.apiRequest(&result, http.MethodDelete, "/device-credentials?id="+url.QueryEscape(strconv.Itoa(id)))
	return result
}

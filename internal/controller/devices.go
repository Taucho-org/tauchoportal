package controller

import (
	"net/http"
	"net/url"
)

type Devices struct{}

type Device struct {
	Id               string            `json:"id"`
	UserId           int               `json:"user_id"`
	Name             string            `json:"name"`
	Brand            string            `json:"brand"`
	ProductId        string            `json:"product_id"`
	ProductName      string            `json:"product_name"`
	Room             string            `json:"room"`
	IsConfigured     bool              `json:"is_configured"`
	Status           string            `json:"status"`
	DeviceIdentifier map[string]string `json:"device_identifier"`
	DeviceGroupId    string            `json:"device_group_id"`
	SupportedActions []string          `json:"supported_actions"`
	CreatedAt        string            `json:"created_at"`
	UpdatedAt        string            `json:"updated_at"`
}

type GetDeviceResponse = Device
type CreateDeviceResponse = Device
type UpdateDeviceResponse = Device

type CreateDeviceRequest struct {
	Name             string            `json:"name"`
	Brand            string            `json:"brand"`
	ProductId        string            `json:"product_id"`
	Room             string            `json:"room"`
	DeviceIdentifier map[string]string `json:"device_identifier"`
}

type UpdateDeviceRequest struct {
	Name             string            `json:"name"`
	ProductId        string            `json:"product_id"`
	Room             string            `json:"room"`
	DeviceIdentifier map[string]string `json:"device_identifier"`
}

type DeleteDeviceResponse struct {
	Status string `json:"status"`
}

type TestDeviceParams struct {
	Brightness int `json:"brightness"`
}

type TestDeviceRequest struct {
	TemplateId int              `json:"template_id"`
	Action     string           `json:"action"`
	Params     TestDeviceParams `json:"params"`
}

type TestDeviceResponse struct {
	Status  string `json:"status"`
	Device  string `json:"device"`
	Brand   string `json:"brand"`
	Action  string `json:"action"`
	Message string `json:"message"`
}

func (Devices) ListDevices() []Device {
	var result []Device
	apiRequest(&result, http.MethodGet, "/devices")
	return result
}

func (Devices) CreateDevice(request CreateDeviceRequest) CreateDeviceResponse {
	var result CreateDeviceResponse
	apiRequest(&result, http.MethodPost, "/devices", request)
	return result
}

func (Devices) UpdateDevice(id string, request UpdateDeviceRequest) UpdateDeviceResponse {
	var result UpdateDeviceResponse
	apiRequest(&result, http.MethodPatch, "/devices/update?id="+url.QueryEscape(id), request)
	return result
}

func (Devices) DeleteDevice(id string) DeleteDeviceResponse {
	var result DeleteDeviceResponse
	apiRequest(&result, http.MethodDelete, "/devices?id="+url.QueryEscape(id))
	return result
}

func (Devices) TestDevice(id string, request TestDeviceRequest) TestDeviceResponse {
	var result TestDeviceResponse
	apiRequest(&result, http.MethodPost, "/devices/test?id="+url.QueryEscape(id), request)
	return result
}

package controller

import (
	"net/http"
	"net/url"
)

type DeviceGroups struct{}

type DeviceGroup struct {
	Id              string `json:"id"`
	UserId          int    `json:"user_id"`
	Name            string `json:"name"`
	DeviceTargeting string `json:"device_targeting"`
	ConcurrencyMode string `json:"concurrency_mode"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

type DeviceGroupWithDevices struct {
	Id              string   `json:"id"`
	UserId          int      `json:"user_id"`
	Name            string   `json:"name"`
	DeviceTargeting string   `json:"device_targeting"`
	ConcurrencyMode string   `json:"concurrency_mode"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
	Devices         []Device `json:"devices"`
}

type ListDeviceGroupsResponse []DeviceGroup
type GetDeviceGroupResponse = DeviceGroupWithDevices
type CreateDeviceGroupResponse = DeviceGroup
type UpdateDeviceGroupResponse = DeviceGroup

type CreateDeviceGroupRequest struct {
	Name            string `json:"name"`
	DeviceTargeting string `json:"device_targeting,omitempty"`
	ConcurrencyMode string `json:"concurrency_mode,omitempty"`
}

type UpdateDeviceGroupRequest struct {
	Name            string `json:"name"`
	DeviceTargeting string `json:"device_targeting,omitempty"`
	ConcurrencyMode string `json:"concurrency_mode,omitempty"`
}

type DeleteDeviceGroupResponse struct {
	Status string `json:"status"`
}

type AssignDeviceToGroupResponse struct {
	Status   string `json:"status"`
	DeviceId string `json:"device_id"`
	GroupId  string `json:"group_id"`
}

type RemoveDeviceFromGroupResponse struct {
	Status   string `json:"status"`
	DeviceId string `json:"device_id"`
}

func (DeviceGroups) ListDeviceGroups() ListDeviceGroupsResponse {
	var result ListDeviceGroupsResponse
	apiRequest(&result, http.MethodGet, "/device-groups")
	return result
}

func (DeviceGroups) GetDeviceGroup(id string) GetDeviceGroupResponse {
	var result GetDeviceGroupResponse
	apiRequest(&result, http.MethodGet, "/device-groups/get?id="+url.QueryEscape(id))
	return result
}

func (DeviceGroups) CreateDeviceGroup(request CreateDeviceGroupRequest) CreateDeviceGroupResponse {
	var result CreateDeviceGroupResponse
	apiRequest(&result, http.MethodPost, "/device-groups", request)
	return result
}

func (DeviceGroups) UpdateDeviceGroup(id string, request UpdateDeviceGroupRequest) UpdateDeviceGroupResponse {
	var result UpdateDeviceGroupResponse
	apiRequest(&result, http.MethodPatch, "/device-groups/update?id="+url.QueryEscape(id), request)
	return result
}

func (DeviceGroups) DeleteDeviceGroup(id string) DeleteDeviceGroupResponse {
	var result DeleteDeviceGroupResponse
	apiRequest(&result, http.MethodDelete, "/device-groups?id="+url.QueryEscape(id))
	return result
}

func (DeviceGroups) AssignDeviceToGroup(deviceId string, groupId string) AssignDeviceToGroupResponse {
	var result AssignDeviceToGroupResponse
	apiRequest(&result, http.MethodPost, "/device-groups/assign?device_id="+url.QueryEscape(deviceId)+"&group_id="+url.QueryEscape(groupId))
	return result
}

func (DeviceGroups) RemoveDeviceFromGroup(deviceId string) RemoveDeviceFromGroupResponse {
	var result RemoveDeviceFromGroupResponse
	apiRequest(&result, http.MethodPost, "/device-groups/remove?device_id="+url.QueryEscape(deviceId))
	return result
}

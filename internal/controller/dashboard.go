package controller

import (
	"net/http"
)

type Dashboard struct{ s *session }

// DashboardStatsResponse represents the complete dashboard data from the API
type DashboardStatsResponse struct {
	Stats           DashboardStats           `json:"stats"`
	Activity        []DashboardActivity     `json:"activity"`
	ChannelsStatus  []ChannelStatus         `json:"channels_status"`
	DevicesStatus   []DeviceStatus          `json:"devices_status"`
}

// DashboardStats contains aggregated statistics
type DashboardStats struct {
	Channels   ChannelStats   `json:"channels"`
	Devices    DeviceStats    `json:"devices"`
	Conditions ConditionStats `json:"conditions"`
}

// ChannelStats contains channel-related metrics
type ChannelStats struct {
	Total       int `json:"total"`
	Live        int `json:"live"`
	Change      int `json:"change"`
	ChangePercent float64 `json:"change_percent"`
}

// DeviceStats contains device-related metrics
type DeviceStats struct {
	Total   int `json:"total"`
	Online  int `json:"online"`
	Offline int `json:"offline"`
	Warning int `json:"warning"`
}

// ConditionStats contains condition-related metrics
type ConditionStats struct {
	Total         int `json:"total"`
	Enabled       int `json:"enabled"`
	TriggersToday int `json:"triggers_today"`
	TriggersChange int `json:"triggers_change"`
}

// DashboardActivity represents an activity feed item
type DashboardActivity struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Detail      string `json:"detail"`
	ChannelName string `json:"channel_name,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	Icon        string `json:"icon"`
}

// ChannelStatus represents a channel's current status
type ChannelStatus struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Platform     string `json:"platform"`
	Status       string `json:"status"`
	LastStream   string `json:"last_stream"`
	ThumbnailUrl string `json:"thumbnail_url"`
}

// DeviceStatus represents a device's current status
type DeviceStatus struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Brand        string `json:"brand"`
	Status       string `json:"status"`
	Room         string `json:"room"`
	LastSeen     string `json:"last_seen"`
	ThumbnailUrl string `json:"thumbnail_url"`
}

// GetDashboardStats fetches the complete dashboard data from API
func (ctl Dashboard) GetDashboardStats() DashboardStatsResponse {
	var result DashboardStatsResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/dashboard/stats")
	return result
}

package controller

import (
	"net/http"
	"net/url"
)

type PlatformConfig struct{ s *session }

// PlatformParameter represents a single parameter for an event
type PlatformParameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Available   bool   `json:"available"`
	Description string `json:"description"`
}

// PlatformsListResponse is the response from GET /platform-config/platforms
type PlatformsListResponse struct {
	Platforms []string `json:"platforms"`
}

// EventsListResponse is the response from GET /platform-config/platforms/{platform}/events
type EventsListResponse struct {
	Platform string   `json:"platform"`
	Events   []string `json:"events"`
}

// ParametersResponse is the response from parameter endpoints
type ParametersResponse struct {
	Platform   string               `json:"platform"`
	Event      string               `json:"event"`
	Parameters []PlatformParameter  `json:"parameters"`
}

// ParameterAvailableResponse is the response from single parameter check
type ParameterAvailableResponse struct {
	Platform  string `json:"platform"`
	Event     string `json:"event"`
	Parameter string `json:"parameter"`
	Available bool   `json:"available"`
}

// ListPlatforms fetches all available platforms
func (ctl PlatformConfig) ListPlatforms() []string {
	var result PlatformsListResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms")
	return result.Platforms
}

// ListEventsForPlatform fetches all events for a specific platform
func (ctl PlatformConfig) ListEventsForPlatform(platform string) []string {
	var result EventsListResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms/"+url.PathEscape(platform)+"/events")
	return result.Events
}

// GetAvailableParameters fetches only available parameters for an event
func (ctl PlatformConfig) GetAvailableParameters(platform, event string) []PlatformParameter {
	var result ParametersResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms/"+url.PathEscape(platform)+"/events/"+url.PathEscape(event)+"/parameters/available")
	return result.Parameters
}

// GetAllParameters fetches all parameters (available and unavailable) for an event
func (ctl PlatformConfig) GetAllParameters(platform, event string) []PlatformParameter {
	var result ParametersResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms/"+url.PathEscape(platform)+"/events/"+url.PathEscape(event)+"/parameters")
	return result.Parameters
}

// GetUnavailableParameters fetches only unavailable parameters for an event
func (ctl PlatformConfig) GetUnavailableParameters(platform, event string) []PlatformParameter {
	var result ParametersResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms/"+url.PathEscape(platform)+"/events/"+url.PathEscape(event)+"/parameters/unavailable")
	return result.Parameters
}

// CheckParameterAvailable checks if a single parameter is available for an event
func (ctl PlatformConfig) CheckParameterAvailable(platform, event, parameter string) bool {
	var result ParameterAvailableResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform-config/platforms/"+url.PathEscape(platform)+"/events/"+url.PathEscape(event)+"/parameters/"+url.PathEscape(parameter)+"/available")
	return result.Available
}

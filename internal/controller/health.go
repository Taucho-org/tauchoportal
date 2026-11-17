package controller

import (
	"net/http"
)

type Health struct{ s *session }

type HealthCheckResponse struct {
	Status string `json:"status"`
}

func (ctl Health) HealthCheck() HealthCheckResponse {
	var result HealthCheckResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/health")
	return result
}

type ServiceStatusResponse struct {
	Error string `json:"error"`
}

func (ctl Health) ServiceStatus() ServiceStatusResponse {
	var result ServiceStatusResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/version")
	return result
}

type EnvironmentResponse struct {
	Error string `json:"error"`
}

func (ctl Health) Environment() EnvironmentResponse {
	var result EnvironmentResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/debug/env")
	return result
}

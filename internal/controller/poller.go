package controller

import (
	"net/http"
)

type Poller struct{ s *session }

type PollerStatusResponse struct {
	IsRunning bool   `json:"is_running"`
	Timestamp string `json:"timestamp"`
}

type StartPollerResponse struct {
	Status string `json:"status"`
}

type StopPollerResponse struct {
	Status string `json:"status"`
}

func (ctl Poller) PollerStatus() PollerStatusResponse {
	var result PollerStatusResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/poller/status")
	return result
}

func (ctl Poller) StartPoller() StartPollerResponse {
	var result StartPollerResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/poller/start")
	return result
}

func (ctl Poller) StopPoller() StopPollerResponse {
	var result StopPollerResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/poller/stop")
	return result
}

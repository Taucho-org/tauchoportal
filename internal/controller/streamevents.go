package controller

import (
	"net/http"
	"net/url"
	"strconv"
)

type StreamEvents struct{ s *session }

type StreamEvent struct {
	Id            string `json:"id"`
	UserId        int    `json:"user_id"`
	WatchTargetId string `json:"watch_target_id"`
	Provider      string `json:"provider"`
	StreamId      string `json:"stream_id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	LiveUrl       string `json:"live_url"`
	ThumbnailUrl  string `json:"thumbnail_url"`
	StartedAt     string `json:"started_at"`
	Status        string `json:"status"`
	WatcherCalled bool   `json:"watcher_called"`
	DetectedAt    string `json:"detected_at"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type ListStreamEventsResponse []StreamEvent
type GetStreamEventResponse = StreamEvent

func (ctl StreamEvents) ListStreamEvents(limit int, watchId string) ListStreamEventsResponse {
	path := "/stream-events"
	query := url.Values{}
	if limit > 0 {
		query.Set("limit", strconv.Itoa(limit))
	}
	if watchId != "" {
		query.Set("watch_id", watchId)
	}
	if encoded := query.Encode(); encoded != "" {
		path += "?" + encoded
	}

	var result ListStreamEventsResponse
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl StreamEvents) GetStreamEvent(id string) GetStreamEventResponse {
	var result GetStreamEventResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/stream-events/get?id="+url.QueryEscape(id))
	return result
}

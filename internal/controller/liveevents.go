package controller

import (
	"net/http"
	"net/url"
	"strconv"
)

type LiveEvents struct{ s *session }

type LiveEventRaw struct {
	PurchaseAmountMicros int64 `json:"purchase_amount_micros"`
}

type LiveEvent struct {
	Id             string       `json:"id"`
	UserId         int          `json:"user_id"`
	WatchTargetId  string       `json:"watch_target_id"`
	StreamEventId  string       `json:"stream_event_id"`
	Platform       string       `json:"platform"`
	EventType      string       `json:"event_type"`
	SenderId       string       `json:"sender_id"`
	SenderName     string       `json:"sender_name"`
	SenderAvatar   string       `json:"sender_avatar"`
	Message        string       `json:"message"`
	AmountValue    int          `json:"amount_value"`
	AmountCurrency string       `json:"amount_currency"`
	AmountDisplay  string       `json:"amount_display"`
	IsMember       bool         `json:"is_member"`
	IsMod          bool         `json:"is_mod"`
	Badges         []string     `json:"badges"`
	Raw            LiveEventRaw `json:"raw"`
	ReceivedAt     string       `json:"received_at"`
	CreatedAt      string       `json:"created_at"`
	Color          *string      `json:"color,omitempty"`
	ColorRgb       *ColorRgb    `json:"color_rgb,omitempty"`
	Position       *string      `json:"position,omitempty"`
	Size           *string      `json:"size,omitempty"`
	Font           *string      `json:"font,omitempty"`
	Opacity        *string      `json:"opacity,omitempty"`
}

type ColorRgb struct {
	R   int    `json:"r"`
	G   int    `json:"g"`
	B   int    `json:"b"`
	Hex string `json:"hex"`
}

type ListLiveEventsResponse []LiveEvent
type GetLiveEventResponse = LiveEvent

type CountLiveEventsByTypeResponse struct {
	Comment    int `json:"comment"`
	Superchat  int `json:"superchat"`
	Sticker    int `json:"sticker"`
	Gift       int `json:"gift"`
	Cheer      int `json:"cheer"`
	Member     int `json:"member"`
	Follow     int `json:"follow"`
	Sub        int `json:"sub"`
	Raid       int `json:"raid"`
	Nicoru     int `json:"nicoru"`
	Like       int `json:"like"`
	HypeTrain  int `json:"hype_train"`
	Reaction   int `json:"reaction"`
	ViewerJoin int `json:"viewer_join"`
}

func (ctl LiveEvents) ListLiveEvents(streamId string, eventType string, limit int) ListLiveEventsResponse {
	path := "/live-events"
	query := url.Values{}
	if streamId != "" {
		query.Set("stream_id", streamId)
	}
	if eventType != "" {
		query.Set("event_type", eventType)
	}
	if limit > 0 {
		query.Set("limit", strconv.Itoa(limit))
	}
	if encoded := query.Encode(); encoded != "" {
		path += "?" + encoded
	}

	var result ListLiveEventsResponse
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl LiveEvents) GetLiveEvent(id string) GetLiveEventResponse {
	var result GetLiveEventResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/live-events/get?id="+url.QueryEscape(id))
	return result
}

func (ctl LiveEvents) CountLiveEventsByType(streamId string) CountLiveEventsByTypeResponse {
	var result CountLiveEventsByTypeResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/live-events/count?stream_id="+url.QueryEscape(streamId))
	return result
}

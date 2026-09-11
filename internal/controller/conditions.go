package controller

import (
	"net/http"
	"net/url"
)

type Conditions struct{}

type EventSchemaField struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Optional    bool   `json:"optional"`
}

type EventMetadataResponse struct {
	Platform  string                      `json:"platform"`
	EventType string                      `json:"event_type"`
	Fields    map[string]EventSchemaField `json:"fields"`
}

type ConditionLogic struct {
	Operator      string           `json:"Operator"`
	Variables     []string         `json:"Variables"`
	SubConditions []ConditionLogic `json:"SubConditions"`
}

type ConditionDeviceActionParams map[string]interface{}

type ConditionTestDeviceActionParams struct {
	Color         string  `json:"color"`
	DurationMs    *int    `json:"duration_ms"`
	ComputedValue *string `json:"computed_value"`
}

type Condition struct {
	Id                         string                      `json:"id"`
	WatchId                    string                      `json:"watch_id"`
	Name                       string                      `json:"name"`
	EventType                  string                      `json:"event_type"`
	Filter                     string                      `json:"filter"`
	ConditionLogic             ConditionLogic              `json:"condition_logic"`
	IsEnabled                  bool                        `json:"is_enabled"`
	DeviceId                   string                      `json:"device_id"`
	DeviceAction               string                      `json:"device_action"`
	DeviceActionParams         ConditionDeviceActionParams `json:"device_action_params"`
	DeviceActionBody           map[string]interface{}      `json:"device_action_body,omitempty"`
	DeviceActionParamName      string                      `json:"device_action_param_name,omitempty"`
	DeviceActionParamEvaluator ConditionLogic              `json:"device_action_param_evaluator,omitempty"`
	LastTriggeredAt            string                      `json:"last_triggered_at"`
	CreatedAt                  string                      `json:"created_at"`
	UpdatedAt                  string                      `json:"updated_at"`
}

type ListConditionsResponse []Condition
type GetConditionResponse = Condition
type CreateConditionResponse = Condition
type UpdateConditionResponse = Condition

type CreateConditionRequest struct {
	WatchId                    string                      `json:"watch_id"`
	Name                       string                      `json:"name"`
	EventType                  string                      `json:"event_type"`
	Filter                     string                      `json:"filter"`
	ConditionLogic             ConditionLogic              `json:"condition_logic"`
	IsEnabled                  bool                        `json:"is_enabled"`
	DeviceId                   string                      `json:"device_id"`
	DeviceAction               string                      `json:"device_action"`
	DeviceActionParams         ConditionDeviceActionParams `json:"device_action_params"`
	DeviceActionBody           map[string]interface{}      `json:"device_action_body,omitempty"`
	DeviceActionParamName      string                      `json:"device_action_param_name,omitempty"`
	DeviceActionParamEvaluator ConditionLogic              `json:"device_action_param_evaluator,omitempty"`
}

type UpdateConditionRequest struct {
	Name                       string                      `json:"name"`
	EventType                  string                      `json:"event_type"`
	Filter                     string                      `json:"filter"`
	ConditionLogic             ConditionLogic              `json:"condition_logic"`
	IsEnabled                  bool                        `json:"is_enabled"`
	DeviceId                   string                      `json:"device_id"`
	DeviceAction               string                      `json:"device_action"`
	DeviceActionParams         ConditionDeviceActionParams `json:"device_action_params"`
	DeviceActionBody           map[string]interface{}      `json:"device_action_body,omitempty"`
	DeviceActionParamName      string                      `json:"device_action_param_name,omitempty"`
	DeviceActionParamEvaluator ConditionLogic              `json:"device_action_param_evaluator,omitempty"`
}

type DeleteConditionResponse struct {
	Status string `json:"status"`
}

type ConditionTestEventRaw struct {
	PurchaseAmountMicros int64 `json:"purchase_amount_micros"`
}

type ConditionTestEvent struct {
	Id             string                `json:"id"`
	UserId         int                   `json:"user_id"`
	WatchTargetId  string                `json:"watch_target_id"`
	StreamEventId  string                `json:"stream_event_id"`
	Platform       string                `json:"platform"`
	EventType      string                `json:"event_type"`
	SenderId       string                `json:"sender_id"`
	SenderName     string                `json:"sender_name"`
	SenderAvatar   string                `json:"sender_avatar"`
	Message        string                `json:"message"`
	AmountValue    int                   `json:"amount_value"`
	AmountCurrency string                `json:"amount_currency"`
	AmountDisplay  string                `json:"amount_display"`
	IsMember       bool                  `json:"is_member"`
	IsMod          bool                  `json:"is_mod"`
	Badges         []string              `json:"badges"`
	Raw            ConditionTestEventRaw `json:"raw"`
	ReceivedAt     string                `json:"received_at"`
	CreatedAt      string                `json:"created_at"`
}

type TestDraftConditionLogicRequest struct {
	ConditionLogic             ConditionLogic              `json:"condition_logic"`
	TestEvent                  ConditionTestEvent          `json:"test_event"`
	DeviceId                   string                      `json:"device_id"`
	DeviceAction               string                      `json:"device_action"`
	DeviceActionParams         ConditionDeviceActionParams `json:"device_action_params"`
	DeviceActionBody           map[string]interface{}      `json:"device_action_body,omitempty"`
	DeviceActionParamName      string                      `json:"device_action_param_name,omitempty"`
	DeviceActionParamEvaluator ConditionLogic              `json:"device_action_param_evaluator,omitempty"`
	TriggerRealDevice          bool                        `json:"trigger_real_device"`
}

type TestDraftConditionLogicResponse struct {
	Matched                  bool                            `json:"matched"`
	ComputedValues           []string                        `json:"computed_values"`
	DeviceId                 string                          `json:"device_id"`
	DeviceAction             string                          `json:"device_action"`
	DeviceActionParams       ConditionTestDeviceActionParams `json:"device_action_params"`
	DeviceActionBody         map[string]interface{}          `json:"device_action_body,omitempty"`
	DeviceActionParamName    string                          `json:"device_action_param_name,omitempty"`
	ComputedDeviceActionBody map[string]interface{}          `json:"computed_device_action_body,omitempty"`
	WouldTrigger             bool                            `json:"would_trigger"`
}

type TestSavedConditionRequest struct {
	TestEvent         ConditionTestEvent `json:"test_event"`
	TriggerRealDevice bool               `json:"trigger_real_device"`
}

type TestSavedConditionResponse struct {
	ConditionId              string                          `json:"condition_id"`
	ConditionName            string                          `json:"condition_name"`
	Matched                  bool                            `json:"matched"`
	ComputedValues           []string                        `json:"computed_values"`
	DeviceId                 string                          `json:"device_id"`
	DeviceAction             string                          `json:"device_action"`
	DeviceActionParams       ConditionTestDeviceActionParams `json:"device_action_params"`
	DeviceActionBody         map[string]interface{}          `json:"device_action_body,omitempty"`
	DeviceActionParamName    string                          `json:"device_action_param_name,omitempty"`
	ComputedDeviceActionBody map[string]interface{}          `json:"computed_device_action_body,omitempty"`
	WouldTrigger             bool                            `json:"would_trigger"`
}

type TestAllConditionsRequest struct {
	WatchTargetId     string             `json:"watch_target_id"`
	TestEvent         ConditionTestEvent `json:"test_event"`
	TriggerRealDevice bool               `json:"trigger_real_device"`
}

type TestAllConditionsResponse struct {
	TotalConditions int                          `json:"total_conditions"`
	Matched         int                          `json:"matched"`
	Triggered       int                          `json:"triggered"`
	Errors          int                          `json:"errors"`
	Results         []TestSavedConditionResponse `json:"results"`
}

func (Conditions) ListConditions(watchId string) ListConditionsResponse {
	path := "/conditions"
	if watchId != "" {
		path += "?watch_id=" + url.QueryEscape(watchId)
	}

	var result ListConditionsResponse
	apiRequest(&result, http.MethodGet, path)
	return result
}

func (Conditions) GetCondition(id string) GetConditionResponse {
	var result GetConditionResponse
	apiRequest(&result, http.MethodGet, "/conditions/get?id="+url.QueryEscape(id))
	return result
}

func (Conditions) CreateCondition(request CreateConditionRequest) CreateConditionResponse {
	var result CreateConditionResponse
	apiRequest(&result, http.MethodPost, "/conditions", request)
	return result
}

func (Conditions) UpdateCondition(id string, request UpdateConditionRequest) UpdateConditionResponse {
	var result UpdateConditionResponse
	apiRequest(&result, http.MethodPatch, "/conditions/update?id="+url.QueryEscape(id), request)
	return result
}

func (Conditions) DeleteCondition(id string) DeleteConditionResponse {
	var result DeleteConditionResponse
	apiRequest(&result, http.MethodDelete, "/conditions?id="+url.QueryEscape(id))
	return result
}

func (Conditions) TestDraftConditionLogic(request TestDraftConditionLogicRequest) TestDraftConditionLogicResponse {
	var result TestDraftConditionLogicResponse
	apiRequest(&result, http.MethodPost, "/conditions/test-draft", request)
	return result
}

func (Conditions) TestSavedCondition(id string, request TestSavedConditionRequest) TestSavedConditionResponse {
	var result TestSavedConditionResponse
	apiRequest(&result, http.MethodPost, "/conditions/"+url.PathEscape(id)+"/test", request)
	return result
}

func (Conditions) TestAllConditions(request TestAllConditionsRequest) TestAllConditionsResponse {
	var result TestAllConditionsResponse
	apiRequest(&result, http.MethodPost, "/conditions/test-all", request)
	return result
}

// GetEventMetadata fetches event schema for a specific platform and event type
func (Conditions) GetEventMetadata(platform, eventType string) EventMetadataResponse {
	var result EventMetadataResponse
	apiRequest(&result, http.MethodGet, "/event-metadata/"+url.PathEscape(platform)+"/"+url.PathEscape(eventType))
	return result
}

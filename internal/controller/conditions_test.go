package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestConditionActionRequestContract(t *testing.T) {
	body := map[string]interface{}{
		"brightness": map[string]interface{}{"Operator": "PARAM", "Variables": []string{"content"}},
		"enabled":    false,
	}
	for name, request := range map[string]interface{}{
		"create": CreateConditionRequest{DeviceGroupId: "group-1", DeviceActionBody: body},
		"update": UpdateConditionRequest{DeviceGroupId: "group-1", DeviceActionBody: body},
		"test":   TestDraftConditionLogicRequest{DeviceGroupId: "group-1", DeviceActionBody: body},
	} {
		t.Run(name, func(t *testing.T) {
			encoded, err := json.Marshal(request)
			if err != nil {
				t.Fatal(err)
			}
			var fields map[string]json.RawMessage
			if err := json.Unmarshal(encoded, &fields); err != nil {
				t.Fatal(err)
			}
			if string(fields["device_group_id"]) != `"group-1"` {
				t.Fatalf("missing device group: %s", encoded)
			}
			wantBody, err := json.Marshal(body)
			if err != nil {
				t.Fatal(err)
			}
			if string(fields["device_action_body"]) != string(wantBody) {
				t.Fatalf("action body changed: %s", encoded)
			}
			for _, obsolete := range []string{"device_action_param_name", "device_action_param_evaluator"} {
				if _, exists := fields[obsolete]; exists {
					t.Fatalf("obsolete field %s included", obsolete)
				}
			}
		})
	}
}

func TestConditionTestResolvedBody(t *testing.T) {
	payload := []byte(`{"device_group_id":"group-1","resolved_action_body":{"brightness":75,"enabled":false}}`)
	var draft TestDraftConditionLogicResponse
	var saved TestSavedConditionResponse
	if err := json.Unmarshal(payload, &draft); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(payload, &saved); err != nil {
		t.Fatal(err)
	}
	if draft.DeviceGroupId != "group-1" || draft.ResolvedActionBody["brightness"] != float64(75) {
		t.Fatalf("resolved draft action lost: %#v", draft)
	}
	if !reflect.DeepEqual(saved.ResolvedActionBody, draft.ResolvedActionBody) {
		t.Fatalf("resolved saved action lost: %#v", saved)
	}
}

func TestConditionPageLoadsCurrentActionFields(t *testing.T) {
	previousURL, previousClient, previousUser := baseUrl, httpClient, loginUserId
	t.Cleanup(func() {
		baseUrl, httpClient, loginUserId = previousURL, previousClient, previousUser
	})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/watches":
			w.Write([]byte(`[{"id":"watch-1","name":"Channel","platform":"youtube"}]`))
		case "/conditions/get":
			w.Write([]byte(`{"id":"condition-1","event_type":"comment","device_group_id":"group-1","device_action_body":{"enabled":false,"brightness":{"Operator":"PARAM","Variables":["content"]}}}`))
		default:
			w.Write([]byte(`{}`))
		}
	}))
	defer server.Close()
	baseUrl, httpClient = server.URL, server.Client()
	page := PrepareConditionPageData("watch-1", "condition-1", nil)
	var params struct {
		Group string                 `json:"device_group_id"`
		Body  map[string]interface{} `json:"device_action_body"`
	}
	if err := json.Unmarshal([]byte(page.Condition.DeviceActionParams), &params); err != nil {
		t.Fatal(err)
	}
	if params.Group != "group-1" || params.Body["enabled"] != false {
		t.Fatalf("saved parameters not loaded: %s", page.Condition.DeviceActionParams)
	}
	logic, ok := params.Body["brightness"].(map[string]interface{})
	if !ok || logic["Operator"] != "PARAM" {
		t.Fatalf("saved field evaluator not loaded: %#v", params.Body)
	}
}

package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestConditionActionRequestContract(t *testing.T) {
	templateId := "7"
	body := map[string]interface{}{
		"brightness": map[string]interface{}{"Operator": "PARAM", "Variables": []string{"content"}},
		"enabled":    false,
	}
	for name, request := range map[string]interface{}{
		"create": CreateConditionRequest{DeviceGroupId: "group-1", DeviceActionBody: body, TemplateId: &templateId},
		"update": UpdateConditionRequest{DeviceGroupId: "group-1", DeviceActionBody: body, TemplateId: &templateId},
		"test":   TestDraftConditionLogicRequest{DeviceGroupId: "group-1", DeviceActionBody: body, TemplateId: &templateId},
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
			if string(fields["template_id"]) != `"7"` {
				t.Fatalf("missing template ID: %s", encoded)
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

func TestConditionTemplateIdDecoding(t *testing.T) {
	for _, value := range []string{`188`, `"188"`, `null`, `"999999999999999999999999999"`} {
		t.Run(value, func(t *testing.T) {
			var condition Condition
			payload := `{"id":"condition-1","template_id":` + value + `,"device_action_body":{"brightness":11},"condition_logic":{"operator":"OR","variables":null,"subconditions":[{"operator":"PARAM","variables":["message"]}]}}`
			if err := json.Unmarshal([]byte(payload), &condition); err != nil {
				t.Fatal(err)
			}
			if value == "null" {
				if condition.TemplateId != nil {
					t.Fatal("null template ID must remain absent")
				}
			} else {
				var expected json.Number
				if err := json.Unmarshal([]byte(value), &expected); err != nil {
					t.Fatal(err)
				}
				if condition.TemplateId == nil || *condition.TemplateId != expected.String() {
					t.Fatalf("template ID not decoded: %#v", condition.TemplateId)
				}
			}
			if condition.DeviceActionBody["brightness"] != float64(11) || condition.ConditionLogic.Operator != "OR" {
				t.Fatalf("condition fields lost: %#v", condition)
			}
			var list []Condition
			if err := json.Unmarshal([]byte("["+payload+"]"), &list); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(list[0], condition) {
				t.Fatal("list and detail decoding differ")
			}
		})
	}
	for _, value := range []string{`""`, `"abc"`, `1.5`, `false`, `0`, `-1`} {
		var condition Condition
		if err := json.Unmarshal([]byte(`{"template_id":`+value+`}`), &condition); err == nil {
			t.Fatalf("invalid template ID accepted: %s", value)
		}
	}
	var condition Condition
	if err := json.Unmarshal([]byte(`{"id":"legacy"}`), &condition); err != nil || condition.TemplateId != nil {
		t.Fatalf("missing template ID not supported: %v", err)
	}
}

func TestDeviceTestTemplateIdIsString(t *testing.T) {
	for _, id := range []string{"188", "0"} {
		encoded, err := json.Marshal(TestDeviceRequest{TemplateId: id})
		if err != nil {
			t.Fatal(err)
		}
		var fields map[string]json.RawMessage
		if err := json.Unmarshal(encoded, &fields); err != nil {
			t.Fatal(err)
		}
		if string(fields["template_id"]) != `"`+id+`"` {
			t.Fatalf("template ID not encoded as string: %s", encoded)
		}
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
			w.Write([]byte(`{"id":"condition-1","template_id":"188","event_type":"comment","device_group_id":"group-1","device_action_body":{"enabled":false,"brightness":{"Operator":"PARAM","Variables":["content"]}}}`))
		default:
			w.Write([]byte(`{}`))
		}
	}))
	defer server.Close()
	baseUrl, httpClient = server.URL, server.Client()
	page := PrepareConditionPageData("watch-1", "condition-1", nil)
	var params struct {
		Group      string                 `json:"device_group_id"`
		Body       map[string]interface{} `json:"device_action_body"`
		TemplateId *string                `json:"template_id"`
	}
	if err := json.Unmarshal([]byte(page.Condition.DeviceActionParams), &params); err != nil {
		t.Fatal(err)
	}
	if params.Group != "group-1" || params.Body["enabled"] != false {
		t.Fatalf("saved parameters not loaded: %s", page.Condition.DeviceActionParams)
	}
	if params.TemplateId == nil || *params.TemplateId != "188" {
		t.Fatalf("saved template ID not loaded: %s", page.Condition.DeviceActionParams)
	}
	logic, ok := params.Body["brightness"].(map[string]interface{})
	if !ok || logic["Operator"] != "PARAM" {
		t.Fatalf("saved field evaluator not loaded: %#v", params.Body)
	}
}

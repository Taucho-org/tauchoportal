package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
)

type EventMetadata struct{}

type ConditionTemplate struct {
	ID             string      `json:"id"`
	NameKey        string      `json:"name_key"`
	Name           string      `json:"name"`
	DescriptionKey string      `json:"description_key"`
	Description    string      `json:"description"`
	JSON           interface{} `json:"condition_json"`
	//	Input          interface{} `json:"input,omitempty"`
}

type TemplatesForEventResponse struct {
	Platform  string              `json:"platform"`
	EventType string              `json:"event_type"`
	Templates []ConditionTemplate `json:"templates"`
	//	Properties []EventSchemaField  `json:"properties"`
}

type EventPropertyDefinition struct {
	Name           string `json:"name"`
	DescriptionKey string `json:"description_key"`
	Example        string `json:"example"`
}

type EventPropertyGroup struct {
	GroupName  string                    `json:"group_name"`
	Properties []EventPropertyDefinition `json:"properties"`
}

func (EventMetadata) GetTemplatesForEvent(platform, eventType string) TemplatesForEventResponse {
	var result TemplatesForEventResponse
	apiRequest(&result, http.MethodGet, fmt.Sprintf("/condition-templates/%s/%s", url.QueryEscape(platform), url.QueryEscape(eventType)))
	return result
}

func getEventPropertySchemas(platform, eventType string) []EventSchemaField {
	metadata := Conditions{}.GetEventMetadata(platform, eventType)
	return metadata.Fields
}

func (EventMetadata) GetEventTypes(platform string) map[string][]string {
	response := Conditions{}.ListEventTypes(platform)
	allEvents := map[string][]string{
		platform: response.Events,
	}
	return allEvents
}

// normalizeEventType maps event types to their template group
func normalizeEventType(eventType string) string {
	if group, exists := templateEventTypeGroups[eventType]; exists {
		return group
	}
	return eventType
}

// Template event type groups - maps specific event types to template groups
var templateEventTypeGroups = map[string]string{
	"comment":     "comment",
	"gift":        "gift",
	"superchat":   "gift",
	"sticker":     "gift",
	"member":      "member",
	"follow":      "follow",
	"sub":         "sub",
	"cheer":       "cheer",
	"bits":        "cheer",
	"like":        "reaction",
	"reaction":    "reaction",
	"nicoru":      "reaction",
	"raid":        "raid",
	"hype_train":  "reaction",
	"viewer_join": "viewer_join",
}

// Helper functions to build template JSON structures
func buildParam(name string) map[string]interface{} {
	return map[string]interface{}{
		"Operator":      "PARAM",
		"SubConditions": nil,
		"Variables":     []string{name},
	}
}

func buildTextCompare(operator, property, value string) map[string]interface{} {
	return map[string]interface{}{
		"Operator": operator,
		"SubConditions": []interface{}{
			buildParam(property),
		},
		"Variables": []string{value},
	}
}

func buildRegexMatch(property, pattern string) map[string]interface{} {
	return map[string]interface{}{
		"Operator": "REGEX_MATCH",
		"SubConditions": []interface{}{
			buildParam(property),
		},
		"Variables": []string{pattern},
	}
}

func buildNumericCompare(operator, property string, value int) map[string]interface{} {
	return map[string]interface{}{
		"Operator": operator,
		"SubConditions": []interface{}{
			map[string]interface{}{
				"Operator": "PARSEINT",
				"SubConditions": []interface{}{
					buildParam(property),
				},
				"Variables": nil,
			},
			map[string]interface{}{
				"Operator":      "PARSEINT",
				"SubConditions": nil,
				"Variables":     []string{formatInt(value)},
			},
		},
		"Variables": []interface{}{},
	}
}

func formatInt(n int) string {
	return strconv.Itoa(n)
}

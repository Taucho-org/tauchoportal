package controller

import (
	"encoding/json"
	"testing"
)

func TestDeviceTemplateUIFieldsRetainControlMetadata(t *testing.T) {
	const response = `{
		"ui_fields": [
			{"name":"Temperature","key":"temperature_kelvin","type":"slider","min":2000.5,"max":9000,"step":0.5,"unit":"kelvin"},
			{"name":"Mode","key":"mode","type":"select","options":["on",{"label":"Off","value":"off"}]},
			{"name":"Color","key":"rgb","type":"color","format":"rgb24"},
			{"name":"Text","key":"text","type":"text","placeholder":"rgb:255,0,0"}
		]
	}`

	var template DeviceTemplate
	if err := json.Unmarshal([]byte(response), &template); err != nil {
		t.Fatalf("unmarshal device template: %v", err)
	}
	if len(template.UiFields) != 4 {
		t.Fatalf("got %d UI fields, want 4", len(template.UiFields))
	}

	slider := template.UiFields[0]
	if slider.Min != float64(2000.5) || slider.Max != float64(9000) || slider.Step != float64(0.5) {
		t.Fatalf("slider bounds or step were not preserved: %+v", slider)
	}
	if slider.Unit != "kelvin" {
		t.Fatalf("slider unit = %q, want kelvin", slider.Unit)
	}
	if len(template.UiFields[1].Options) != 2 {
		t.Fatalf("select options were not preserved: %+v", template.UiFields[1].Options)
	}
	if template.UiFields[2].Format != "rgb24" {
		t.Fatalf("color format = %q, want rgb24", template.UiFields[2].Format)
	}
	if template.UiFields[3].Placeholder != "rgb:255,0,0" {
		t.Fatalf("text placeholder = %q, want rgb:255,0,0", template.UiFields[3].Placeholder)
	}
}

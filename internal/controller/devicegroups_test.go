package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDeviceGroupModeRequestContract(t *testing.T) {
	for _, targeting := range []string{"ALL", "ROUND_ROBIN", "USER_AFFINITY"} {
		for _, concurrency := range []string{"exclusive", "queued"} {
			for name, request := range map[string]interface{}{
				"create": CreateDeviceGroupRequest{Name: "Group", DeviceTargeting: targeting, ConcurrencyMode: concurrency},
				"update": UpdateDeviceGroupRequest{Name: "Group", DeviceTargeting: targeting, ConcurrencyMode: concurrency},
			} {
				t.Run(name+"/"+targeting+"/"+concurrency, func(t *testing.T) {
					encoded, err := json.Marshal(request)
					if err != nil {
						t.Fatal(err)
					}
					var fields map[string]string
					if err := json.Unmarshal(encoded, &fields); err != nil {
						t.Fatal(err)
					}
					if len(fields) != 3 || fields["name"] != "Group" ||
						fields["device_targeting"] != targeting || fields["concurrency_mode"] != concurrency {
						t.Fatalf("incorrect request fields: %s", encoded)
					}
				})
			}
		}
	}
	encoded, err := json.Marshal(UpdateDeviceGroupRequest{Name: "Renamed"})
	if err != nil {
		t.Fatal(err)
	}
	if string(encoded) != `{"name":"Renamed"}` {
		t.Fatalf("name-only update must not change modes: %s", encoded)
	}
}

func TestDeviceGroupModeResponseContract(t *testing.T) {
	payload := []byte(`{"id":"group","name":"Group","device_targeting":"USER_AFFINITY","concurrency_mode":"queued","devices":[{"id":"one"}]}`)
	var group DeviceGroup
	if err := json.Unmarshal(payload, &group); err != nil {
		t.Fatal(err)
	}
	if group.DeviceTargeting != "USER_AFFINITY" || group.ConcurrencyMode != "queued" {
		t.Fatalf("group modes lost: %#v", group)
	}
	var detail DeviceGroupWithDevices
	if err := json.Unmarshal(payload, &detail); err != nil {
		t.Fatal(err)
	}
	if detail.DeviceTargeting != group.DeviceTargeting || detail.ConcurrencyMode != group.ConcurrencyMode || len(detail.Devices) != 1 {
		t.Fatalf("detail modes or devices lost: %#v", detail)
	}
}

func TestDeviceGroupModesInPageData(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/device-groups" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"id":"group","name":"Group","device_targeting":"ROUND_ROBIN","concurrency_mode":"queued"}]`))
	}))
	defer server.Close()
	oldURL, oldClient := baseUrl, httpClient
	baseUrl, httpClient = server.URL, server.Client()
	t.Cleanup(func() { baseUrl, httpClient = oldURL, oldClient })

	devices := []DeviceForTemplate{
		{ID: "one", DeviceGroupID: "group", GroupKey: "brand|on"},
		{ID: "two", DeviceGroupID: "group", GroupKey: "brand|on"},
	}
	groups, _ := PrepareDeviceGroupsPageData(devices)
	visible, _ := SplitDevicesForDisplay(devices, groups)
	if len(visible) != 1 || visible[0].DeviceTargeting != "ROUND_ROBIN" || visible[0].ConcurrencyMode != "queued" {
		t.Fatalf("template modes lost: %#v", visible)
	}
	encoded, err := json.Marshal(visible[0])
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &fields); err != nil {
		t.Fatal(err)
	}
	if string(fields["device_targeting"]) != `"ROUND_ROBIN"` || string(fields["concurrency_mode"]) != `"queued"` || fields["option"] != nil {
		t.Fatalf("incorrect template JSON: %s", encoded)
	}
}

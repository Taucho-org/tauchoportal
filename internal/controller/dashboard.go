package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"tauchoportal/internal/i18n"
)

type Dashboard struct{}

// DashboardStatsResponse represents the complete dashboard data from the API
type DashboardStatsResponse struct {
	Stats          DashboardStats      `json:"stats"`
	Activity       []DashboardActivity `json:"activity"`
	ChannelsStatus []ChannelStatus     `json:"channels_status"`
	DevicesStatus  []DeviceStatus      `json:"devices_status"`
}

// DashboardStats contains aggregated statistics
type DashboardStats struct {
	Channels   ChannelStats   `json:"channels"`
	Devices    DeviceStats    `json:"devices"`
	Conditions ConditionStats `json:"conditions"`
}

// ChannelStats contains channel-related metrics
type ChannelStats struct {
	Total         int     `json:"total"`
	Live          int     `json:"live"`
	Change        int     `json:"change"`
	ChangePercent float64 `json:"change_percent"`
}

// DeviceStats contains device-related metrics
type DeviceStats struct {
	Total   int `json:"total"`
	Online  int `json:"online"`
	Offline int `json:"offline"`
	Warning int `json:"warning"`
}

// ConditionStats contains condition-related metrics
type ConditionStats struct {
	Total          int `json:"total"`
	Enabled        int `json:"enabled"`
	TriggersToday  int `json:"triggers_today"`
	TriggersChange int `json:"triggers_change"`
}

// DashboardActivity represents an activity feed item
type DashboardActivity struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Detail      string `json:"detail"`
	ChannelName string `json:"channel_name,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	Icon        string `json:"icon"`
}

// ChannelStatus represents a channel's current status
type ChannelStatus struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Platform     string `json:"platform"`
	Status       string `json:"status"`
	LastStream   string `json:"last_stream"`
	ThumbnailUrl string `json:"thumbnail_url"`
}

// DeviceStatus represents a device's current status
type DeviceStatus struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Brand        string `json:"brand"`
	Status       string `json:"status"`
	Room         string `json:"room"`
	LastSeen     string `json:"last_seen"`
	ThumbnailUrl string `json:"thumbnail_url"`
}

// GetDashboardStats fetches the complete dashboard data from API
func (Dashboard) GetDashboardStats() DashboardStatsResponse {
	var result DashboardStatsResponse
	apiRequest(&result, http.MethodGet, "/dashboard/stats")
	return result
}

// DashboardActivityTitle returns a localized title for known activity types,
// keeping user-defined channel, device, and rule names unchanged.
func DashboardActivityTitle(activity DashboardActivity, translator *i18n.Translator) string {
	if translator == nil {
		return activity.Title
	}

	switch activity.Type {
	case "stream_start":
		if activity.ChannelName != "" {
			return translator.T("dashboard.activity.streamStarted", activity.ChannelName)
		}
	case "stream_end":
		if activity.ChannelName != "" {
			return translator.T("dashboard.activity.streamEnded", activity.ChannelName)
		}
	case "condition_triggered":
		fields := strings.Fields(activity.Title)
		if len(fields) > 0 {
			if count, err := strconv.Atoi(fields[0]); err == nil {
				return translator.T("dashboard.activity.conditionsTriggered", strconv.Itoa(count))
			}
		}
		return translator.T("dashboard.activity.conditionTriggered")
	case "device_offline":
		if activity.DeviceName != "" {
			return translator.T("dashboard.activity.deviceOffline", activity.DeviceName)
		}
		if name := strings.TrimSuffix(activity.Title, " offline"); name != activity.Title {
			return translator.T("dashboard.activity.deviceOffline", name)
		}
		return translator.T("dashboard.activity.deviceOfflineGeneric")
	case "condition_error":
		message := strings.TrimPrefix(activity.Title, "Condition error:")
		if message != activity.Title {
			message = strings.TrimSpace(message)
		}
		return translator.T("dashboard.activity.conditionError", message)
	case "device_online":
		if activity.DeviceName != "" {
			return translator.T("dashboard.activity.deviceOnline", activity.DeviceName)
		}
		return translator.T("dashboard.activity.deviceOnlineGeneric")
	default:
		return activity.Title
	}

	return activity.Title
}

// DashboardActivityDetail localizes the fixed wording returned by the
// dashboard API while retaining its dynamic names and counts.
func DashboardActivityDetail(activity DashboardActivity, translator *i18n.Translator) string {
	if translator == nil {
		return activity.Detail
	}

	switch activity.Type {
	case "stream_start", "stream_end":
		channel := activity.ChannelName
		platform, duration := "", ""
		for _, part := range strings.Split(activity.Detail, " • ") {
			switch {
			case strings.HasPrefix(part, "Channel: "):
				channel = strings.TrimPrefix(part, "Channel: ")
			case strings.HasPrefix(part, "Platform: "):
				platform = strings.TrimPrefix(part, "Platform: ")
			case strings.HasPrefix(part, "Duration: "):
				duration = strings.TrimPrefix(part, "Duration: ")
			}
		}
		if activity.Type == "stream_start" {
			if platform != "" {
				return translator.T("dashboard.activity.channelPlatform", channel, platform)
			}
			return translator.T("dashboard.activity.channel", channel)
		}
		if duration != "" {
			return translator.T("dashboard.activity.channelDuration", channel, duration)
		}
		return translator.T("dashboard.activity.channel", channel)
	case "condition_triggered":
		detail := strings.TrimPrefix(activity.Detail, "Actions: ")
		if detail != activity.Detail {
			if n, webhooks, ok := parseActionCounts(detail); ok {
				return translator.T("dashboard.activity.actions", n, webhooks)
			}
		}
		return translator.T("dashboard.activity.conditionsTriggeredDetail")
	case "device_offline":
		device := activity.DeviceName
		duration := ""
		for _, part := range strings.Split(activity.Detail, " • ") {
			if strings.HasPrefix(part, "Device: ") {
				device = strings.TrimPrefix(part, "Device: ")
			}
			if strings.HasPrefix(part, "No response for ") {
				duration = strings.TrimPrefix(part, "No response for ")
			}
		}
		if device != "" && duration != "" {
			return translator.T("dashboard.activity.deviceNoResponse", device, duration)
		}
		return translator.T("dashboard.activity.deviceUnresponsive")
	case "condition_error":
		detail := strings.TrimPrefix(activity.Detail, "Rule: ")
		if detail != activity.Detail {
			if rule, channel, ok := parseFailedRule(detail); ok {
				return translator.T("dashboard.activity.ruleFailed", rule, channel)
			}
		}
		return translator.T("dashboard.activity.conditionCouldNotComplete")
	case "device_online":
		return translator.T("dashboard.activity.deviceResponding")
	default:
		return activity.Detail
	}
}

// DashboardActivityStatus returns a localized label for known status values.
func DashboardActivityStatus(status string, translator *i18n.Translator) string {
	if translator == nil {
		return status
	}
	key := "dashboard.activity.status." + status
	translated := translator.T(key)
	if translated == key {
		return capitalize(status)
	}
	return translated
}

func parseActionCounts(detail string) (string, string, bool) {
	var commands, webhooks int
	if _, err := fmt.Sscanf(detail, "%d device commands, %d webhooks", &commands, &webhooks); err != nil {
		return "", "", false
	}
	return strconv.Itoa(commands), strconv.Itoa(webhooks), true
}

func parseFailedRule(detail string) (string, string, bool) {
	quotedEnd := strings.Index(detail, "' on ")
	if !strings.HasPrefix(detail, "'") || quotedEnd < 2 {
		return "", "", false
	}
	channel := strings.TrimSuffix(detail[quotedEnd+5:], " channel failed")
	if channel == detail[quotedEnd+5:] {
		return "", "", false
	}
	return detail[1:quotedEnd], channel, true
}

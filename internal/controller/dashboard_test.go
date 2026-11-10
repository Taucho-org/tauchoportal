package controller

import (
	"testing"

	"tauchoportal/internal/i18n"
)

func TestDashboardActivityLocalization(t *testing.T) {
	translator := i18n.Load().Translator("en")
	tests := []struct {
		name     string
		activity DashboardActivity
		title    string
		detail   string
		status   string
	}{
		{
			name: "stream start",
			activity: DashboardActivity{
				Type:        "stream_start",
				ChannelName: "NASA",
				Title:       "NASA's stream started",
				Detail:      "Channel: NASA • Platform: YouTube",
				Status:      "streaming",
			},
			title:  "NASA's stream started",
			detail: "Channel: NASA • Platform: YouTube",
			status: "Streaming",
		},
		{
			name: "condition actions",
			activity: DashboardActivity{
				Type:   "condition_triggered",
				Title:  "5 conditions triggered",
				Detail: "Actions: 3 device commands, 2 webhooks",
			},
			title:  "5 conditions triggered",
			detail: "Actions: 3 device commands, 2 webhooks",
		},
		{
			name: "condition failure",
			activity: DashboardActivity{
				Type:   "condition_error",
				Title:  "Condition error: API timeout",
				Detail: "Rule: 'Chat mentions' on Valkyrae channel failed",
				Status: "error",
			},
			title:  "Condition error: API timeout",
			detail: "Rule 'Chat mentions' on Valkyrae channel failed",
			status: "Error",
		},
		{
			name: "device warning",
			activity: DashboardActivity{
				Type:       "device_offline",
				Title:      "LED Controller offline",
				Detail:     "Device: Living Room RGB • No response for 15 min",
				DeviceName: "Living Room RGB",
				Status:     "warning",
			},
			title:  "Living Room RGB is offline",
			detail: "Device: Living Room RGB • No response for 15 min",
			status: "Warning",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DashboardActivityTitle(tt.activity, translator); got != tt.title {
				t.Errorf("DashboardActivityTitle() = %q, want %q", got, tt.title)
			}
			if got := DashboardActivityDetail(tt.activity, translator); got != tt.detail {
				t.Errorf("DashboardActivityDetail() = %q, want %q", got, tt.detail)
			}
			if got := DashboardActivityStatus(tt.activity.Status, translator); got != tt.status {
				t.Errorf("DashboardActivityStatus() = %q, want %q", got, tt.status)
			}
		})
	}
}

func TestDashboardActivityTranslationsExistForEveryLocale(t *testing.T) {
	bundle := i18n.Load()
	keys := []string{
		"dashboard.activity.streamStarted",
		"dashboard.activity.streamEnded",
		"dashboard.activity.conditionsTriggered",
		"dashboard.activity.conditionTriggered",
		"dashboard.activity.deviceOffline",
		"dashboard.activity.deviceOfflineGeneric",
		"dashboard.activity.conditionError",
		"dashboard.activity.deviceOnline",
		"dashboard.activity.deviceOnlineGeneric",
		"dashboard.activity.channel",
		"dashboard.activity.channelPlatform",
		"dashboard.activity.channelDuration",
		"dashboard.activity.actions",
		"dashboard.activity.conditionsTriggeredDetail",
		"dashboard.activity.deviceUnresponsive",
		"dashboard.activity.deviceNoResponse",
		"dashboard.activity.conditionCouldNotComplete",
		"dashboard.activity.ruleFailed",
		"dashboard.activity.deviceResponding",
		"dashboard.activity.status.streaming",
		"dashboard.activity.status.offline",
		"dashboard.activity.status.online",
		"dashboard.activity.status.success",
		"dashboard.activity.status.warning",
		"dashboard.activity.status.error",
		"dashboard.activity.time.justNow",
		"dashboard.activity.time.minuteAgo",
		"dashboard.activity.time.minutesAgo",
		"dashboard.activity.time.hourAgo",
		"dashboard.activity.time.hoursAgo",
		"dashboard.activity.time.dayAgo",
		"dashboard.activity.time.daysAgo",
	}

	for _, language := range i18n.Supported() {
		translator := bundle.Translator(language)
		for _, key := range keys {
			if got := translator.T(key); got == key {
				t.Errorf("translation %q is missing for locale %q", key, language)
			}
		}
	}
}

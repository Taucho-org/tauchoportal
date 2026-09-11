package controller

import (
	"encoding/json"
	"html"
	"sort"
	"time"

	"tauchoportal/internal/i18n"
)

// WatchForTemplate represents a watched channel as prepared for template rendering
type WatchForTemplate struct {
	ID           string
	Name         string
	Platform     string
	ChannelID    string
	IsActive     bool
	Status       string
	ThumbnailUrl string
	LastStream   string
	StreamFilter WatchStreamFilter
}

// ChannelForTemplate represents a channel as prepared for template rendering
type ChannelForTemplate struct {
	ID       string
	Name     string
	Platform string
}

// EventFieldOption represents a single field from the event schema
type EventFieldOption struct {
	Name  string
	Label string
}

// ConditionForTemplate represents a condition as prepared for template rendering
type ConditionForTemplate struct {
	ID                 string
	Name               string
	EventType          string
	Filter             string
	ConditionLogic     string
	IsEnabled          bool
	LastTriggeredAt    string
	DeviceID           string
	DeviceAction       string
	DeviceActionParams string
}

// PageData contains all data needed to render a page
type PageData struct {
	CurrentChannel    *ChannelForTemplate
	Conditions        []ConditionForTemplate
	EventTypes        []string
	PlatformMeta      map[string]map[string]interface{}
	EventBadgeClass   map[string]string
	EventFieldOptions []EventFieldOption
}

// GetEventLabel returns the human-readable label for an event type, using i18n translations if available
func GetEventLabel(eventType, platform string, translator *i18n.Translator) string {
	if translator == nil {
		return capitalize(eventType)
	}
	// Try to get translated label from i18n
	translationKey := "event.type." + eventType
	translated := translator.T(translationKey)
	// If translation key wasn't found, i18n returns the key itself, so check if we got a translation
	if translated != translationKey {
		return translated
	}
	// Fallback to capitalize if no translation found
	return capitalize(eventType)
}

// FormatDateTime formats a date string for display, returning a fallback if empty
func FormatDateTime(dateStr, fallback string) string {
	if dateStr == "" || dateStr == "0001-01-01T00:00:00Z" {
		return fallback
	}
	// Parse and format the date
	t, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		return fallback
	}
	return t.Format("2006-01-02")
}

// EscapeHTML escapes HTML special characters
func EscapeHTML(s string) string {
	return html.EscapeString(s)
}

// GetPlatformMetadata returns metadata for all supported platforms
// Icon data is fetched from the SVG files via icons.Get() in templates
func GetPlatformMetadata(cond Conditions) map[string]map[string]interface{} {
	metadata := cond.ListEventMetadata()
	platformMeta := make(map[string]map[string]interface{})
	for platform := range metadata.Providers {
		platformMeta[platform] = map[string]interface{}{
			"label": capitalize(platform),
		}
	}

	return platformMeta
}

// GetEventBadgeClasses returns CSS class mapping for event badge styling (hardcoded)
func GetEventBadgeClasses(cond Conditions) map[string]string {
	// Event badge classes are hardcoded since the API doesn't provide a general mapping
	return map[string]string{
		"comment":      "comment",
		"superchat":    "gift",
		"sticker":      "gift",
		"cheer":        "gift",
		"gift":         "gift",
		"member":       "follow",
		"follow":       "follow",
		"sub":          "follow",
		"nicoru":       "effect",
		"hype_train":   "stream",
		"raid":         "stream",
		"stream_start": "stream",
		"stream_end":   "stream",
		"like":         "comment",
		"reaction":     "comment",
		"viewer_join":  "follow",
	}
}

// GetEventFieldOptions returns available fields from the event schema with translated labels
func GetEventFieldOptions(cond Conditions, platform, eventType string, translator *i18n.Translator) []EventFieldOption {
	metadata := cond.GetEventMetadata(platform, eventType)

	var options []EventFieldOption
	fields := append([]EventSchemaField(nil), metadata.Fields...)
	sort.Slice(fields, func(i, j int) bool {
		return fields[i].Name < fields[j].Name
	})

	// Convert event metadata fields to options with platform-specific translations.
	for _, field := range fields {
		fieldName := field.Name
		if fieldName == "" {
			continue
		}
		label := field.Name
		if translator != nil {
			// A field can have different meanings on different platforms, so keep the
			// platform in the key: condition.schema.{platform}.{field}.label.
			translationKey := "condition.schema." + platform + "." + fieldName + ".label"
			translatedLabel := translator.T(translationKey)
			// If translation found (not the key itself), use it
			if translatedLabel != "" && translatedLabel != translationKey {
				label = translatedLabel
			} else if field.Description != "" {
				// The API description is the best fallback for newly added fields that
				// have not yet received a locale entry.
				label = field.Description
			}
		}
		options = append(options, EventFieldOption{
			Name:  fieldName,
			Label: label,
		})
	}

	// Return options or empty slice if no parameters available
	return options
}

// capitalize returns a capitalized version of a string
func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return string(s[0]-32) + s[1:]
}

// ChannelDetailForTemplate represents a watch channel with all detail info
type ChannelDetailForTemplate struct {
	ID           string
	Name         string
	Platform     string
	ChannelID    string
	ThumbnailURL string
	IsActive     bool
	Status       string // "live", "offline", "paused"
	LastStreamAt string
	StreamFilter map[string]interface{}
	Conditions   []ConditionDetailForTemplate
}

// ConditionDetailForTemplate represents a condition for channel detail view
type ConditionDetailForTemplate struct {
	ID              string
	Name            string
	EventType       string
	IsEnabled       bool
	LastTriggeredAt string
}

// ChannelDetailPageData contains all data needed to render a channel detail page
type ChannelDetailPageData struct {
	CurrentChannel  *ChannelDetailForTemplate
	PlatformMeta    map[string]map[string]interface{}
	EventBadgeClass map[string]string
}

// DashboardPageData is an alias for the API response (pass it directly to template)
type DashboardPageData = DashboardStatsResponse

// PrepareDashboardPageData fetches dashboard data from the API endpoint
func PrepareDashboardPageData() *DashboardPageData {
	dashAPI := Dashboard{}
	result := dashAPI.GetDashboardStats()
	return &result
}

// ConditionsPageData contains all data needed to render a conditions page
type ConditionsPageData struct {
	CurrentChannel    *ChannelForTemplate
	Conditions        []ConditionForTemplate
	EventTypes        []string
	PlatformMeta      map[string]map[string]interface{}
	EventBadgeClass   map[string]string
	EventFieldOptions []EventFieldOption
}

// PrepareConditionsPageData prepares all data needed to render the conditions page
func PrepareConditionsPageData(channelID string) *ConditionsPageData {
	// Fetch current channel and all conditions
	watches := Watches{}.ListWatches()
	var currentChannel *ChannelForTemplate
	for _, w := range watches {
		if w.Id == channelID {
			currentChannel = &ChannelForTemplate{
				ID:       w.Id,
				Name:     w.Name,
				Platform: w.Platform,
			}
			break
		}
	}

	cond := Conditions{}
	condList := cond.ListConditions(channelID)

	// Get unique event types
	eventTypeMap := make(map[string]bool)
	for _, c := range condList {
		eventTypeMap[c.EventType] = true
	}
	var eventTypes []string
	for et := range eventTypeMap {
		eventTypes = append(eventTypes, et)
	}

	// Convert to template format
	conditions := make([]ConditionForTemplate, 0)
	for _, c := range condList {
		condLogicJSON, _ := json.Marshal(c.ConditionLogic)
		deviceActionParamsJSON, _ := json.Marshal(c.DeviceActionParams)
		conditions = append(conditions, ConditionForTemplate{
			ID:                 c.Id,
			Name:               c.Name,
			EventType:          c.EventType,
			Filter:             c.Filter,
			ConditionLogic:     string(condLogicJSON),
			IsEnabled:          c.IsEnabled,
			LastTriggeredAt:    c.LastTriggeredAt,
			DeviceID:           c.DeviceId,
			DeviceAction:       c.DeviceAction,
			DeviceActionParams: string(deviceActionParamsJSON),
		})
	}

	return &ConditionsPageData{
		CurrentChannel:    currentChannel,
		Conditions:        conditions,
		EventTypes:        eventTypes,
		PlatformMeta:      GetPlatformMetadata(cond),
		EventBadgeClass:   GetEventBadgeClasses(cond),
		EventFieldOptions: []EventFieldOption{}, // Not used on conditions list page
	}
}

// PrepareChannelDetailPageData prepares all data needed to render the channel detail page
func PrepareChannelDetailPageData(channelID string) *ChannelDetailPageData {
	// Fetch current watch and conditions
	watches := Watches{}.ListWatches()
	var currentWatch *Watch
	for _, w := range watches {
		if w.Id == channelID {
			w2 := w
			currentWatch = &w2
			break
		}
	}

	if currentWatch == nil {
		cond := Conditions{}
		return &ChannelDetailPageData{
			PlatformMeta:    GetPlatformMetadata(cond),
			EventBadgeClass: GetEventBadgeClasses(cond),
		}
	}

	// Fetch conditions for this channel
	cond := Conditions{}
	condList := cond.ListConditions(channelID)

	conditions := make([]ConditionDetailForTemplate, 0)
	for _, c := range condList {
		conditions = append(conditions, ConditionDetailForTemplate{
			ID:              c.Id,
			Name:            c.Name,
			EventType:       c.EventType,
			IsEnabled:       c.IsEnabled,
			LastTriggeredAt: c.LastTriggeredAt,
		})
	}

	return &ChannelDetailPageData{
		CurrentChannel: &ChannelDetailForTemplate{
			ID:           currentWatch.Id,
			Name:         currentWatch.Name,
			Platform:     currentWatch.Platform,
			ChannelID:    currentWatch.ChannelId,
			ThumbnailURL: currentWatch.ThumbnailUrl,
			IsActive:     currentWatch.IsActive,
			Status:       currentWatch.Status,
			LastStreamAt: currentWatch.LastStreamAt,
			StreamFilter: map[string]interface{}{
				"require_title_contains":       currentWatch.StreamFilter.RequireTitleContains,
				"skip_if_title_contains":       currentWatch.StreamFilter.SkipIfTitleContains,
				"skip_if_description_contains": currentWatch.StreamFilter.SkipIfDescriptionContains,
			},
			Conditions: conditions,
		},
		PlatformMeta:    GetPlatformMetadata(cond),
		EventBadgeClass: GetEventBadgeClasses(cond),
	}
}

// DeviceForTemplate represents a device prepared for template rendering
type DeviceForTemplate struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	Brand            string            `json:"brand"`
	ProductID        string            `json:"product_id"`
	ProductName      string            `json:"product_name"`
	Room             string            `json:"room"`
	Status           string            `json:"status"` // "online", "offline"
	IsConfigured     bool              `json:"is_configured"`
	BrandColor       string            `json:"brand_color"`
	BrandLogo        string            `json:"brand_logo"`
	SupportedActions []string          `json:"supported_actions"`
	Credentials      map[string]string `json:"credentials"`
}

// BrandForTemplate represents a device brand for template rendering
type BrandForTemplate struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	LogoURL          string            `json:"logo_url"`
	BrandColor       string            `json:"brand_color"`
	AffiliateURL     string            `json:"affiliate_url"`
	Icon             string            `json:"icon"`
	CredentialFields []CredentialField `json:"credential_fields"`
	DocsUrl          string            `json:"docs_url"`
	DocsLabel        string            `json:"docs_label"`
	SortOrder        int               `json:"sort_order"`
}

// DevicesPageData contains all data needed to render the devices page
type DevicesPageData struct {
	Devices      []DeviceForTemplate
	Brands       map[string]*BrandForTemplate
	BrandsSorted []*BrandForTemplate
	BrandIDs     []string
}

// PrepareDevicesPageData prepares all data needed to render the devices page
func PrepareDevicesPageData() *DevicesPageData {
	// Fetch all devices
	devices := Devices{}.ListDevices()
	devicesForTemplate := make([]DeviceForTemplate, 0)

	// Fetch all active brands from catalog
	catalog := Catalog{}
	brands := catalog.ListBrands(true)
	brandsMap := make(map[string]*BrandForTemplate)
	brandsSorted := make([]*BrandForTemplate, 0)

	// Sort brands by sort_order
	sort.Slice(brands, func(i, j int) bool {
		return brands[i].SortOrder < brands[j].SortOrder
	})

	// Build brands map for quick lookup and sorted slice
	for _, b := range brands {
		brandForTemplate := &BrandForTemplate{
			ID:               b.Id,
			Name:             b.Name,
			LogoURL:          b.LogoUrl,
			BrandColor:       b.BrandColor,
			AffiliateURL:     b.AffiliateUrl,
			Icon:             b.Icon,
			CredentialFields: b.CredentialFields,
			DocsUrl:          b.DocsUrl,
			DocsLabel:        b.DocsLabel,
			SortOrder:        b.SortOrder,
		}
		brandsMap[b.Id] = brandForTemplate
		brandsSorted = append(brandsSorted, brandForTemplate)
	}

	// Fetch products by brand for owned device names and supported actions
	productsMap := make(map[string]map[string]interface{})
	for _, brand := range brands {
		products := catalog.ListProducts(brand.Id, true)
		productsByID := make(map[string]interface{})
		for _, p := range products {
			productsByID[p.Id] = map[string]interface{}{
				"name":    p.Name,
				"actions": p.SupportedActions,
			}
		}
		productsMap[brand.Id] = productsByID
	}

	// Convert devices to template format
	for _, dev := range devices {
		brand := brandsMap[dev.Brand]
		productName := dev.ProductId
		var actions []string

		if productMap, ok := productsMap[dev.Brand]; ok {
			if prod, ok := productMap[dev.ProductId]; ok {
				if prodData, ok := prod.(map[string]interface{}); ok {
					if name, ok := prodData["name"].(string); ok {
						productName = name
					}
					if actionsSlice, ok := prodData["actions"].([]interface{}); ok {
						actions = make([]string, 0)
						for _, a := range actionsSlice {
							if str, ok := a.(string); ok {
								actions = append(actions, str)
							}
						}
					}
				}
			}
		}

		brandLogo := ""
		brandColor := "#888888"

		if brand != nil {
			brandLogo = brand.LogoURL
			brandColor = brand.BrandColor
		}

		// Use credentials directly as a map (device.Credentials is already map[string]string)
		credentialsMap := dev.Credentials
		if credentialsMap == nil {
			credentialsMap = make(map[string]string)
		}

		devicesForTemplate = append(devicesForTemplate, DeviceForTemplate{
			ID:               dev.Id,
			Name:             dev.Name,
			Brand:            dev.Brand,
			ProductID:        dev.ProductId,
			ProductName:      productName,
			Room:             dev.Room,
			Status:           dev.Status,
			IsConfigured:     dev.IsConfigured,
			BrandColor:       brandColor,
			BrandLogo:        brandLogo,
			SupportedActions: actions,
			Credentials:      credentialsMap,
		})
	}

	return &DevicesPageData{
		Devices:      devicesForTemplate,
		Brands:       brandsMap,
		BrandsSorted: brandsSorted,
		BrandIDs:     getBrandIDsFromDevices(devicesForTemplate),
	}
}

// Helper function to extract unique brand IDs from devices in order of appearance
func getBrandIDsFromDevices(devices []DeviceForTemplate) []string {
	seen := make(map[string]bool)
	var brandIDs []string

	for _, dev := range devices {
		if !seen[dev.Brand] {
			brandIDs = append(brandIDs, dev.Brand)
			seen[dev.Brand] = true
		}
	}

	return brandIDs
}

// ChannelsPageData contains all data needed to render the channels list page
type ChannelsPageData struct {
	Watches      []WatchForTemplate
	PlatformMeta map[string]map[string]interface{}
}

// PrepareChannelsPageData prepares all data needed to render the channels list page
func PrepareChannelsPageData() *ChannelsPageData {
	// Fetch all watches
	watches := Watches{}.ListWatches()

	watchesForTemplate := make([]WatchForTemplate, 0)
	for _, w := range watches {
		lastStream := FormatDateTime(w.LastStreamAt, "Never")
		watchesForTemplate = append(watchesForTemplate, WatchForTemplate{
			ID:           w.Id,
			Name:         w.Name,
			Platform:     w.Platform,
			ChannelID:    w.ChannelId,
			IsActive:     w.IsActive,
			Status:       w.Status,
			ThumbnailUrl: w.ThumbnailUrl,
			LastStream:   lastStream,
			StreamFilter: w.StreamFilter,
		})
	}

	return &ChannelsPageData{
		Watches:      watchesForTemplate,
		PlatformMeta: GetPlatformMetadata(Conditions{}),
	}
}

// ConditionPageData contains all data needed to render the condition logic page
type ConditionPageData struct {
	CurrentChannel      *ChannelForTemplate
	Condition           *ConditionForTemplate
	PlatformMeta        map[string]map[string]interface{}
	EventFieldOptions   []EventFieldOption
	ConditionTemplates  []ConditionTemplate
	ConditionProperties []EventSchemaField
}

// PrepareConditionPageData prepares all data needed to render a single condition logic page
func PrepareConditionPageData(channelID, conditionID string, translator *i18n.Translator) *ConditionPageData {
	// Fetch current channel
	watches := Watches{}.ListWatches()
	var currentChannel *ChannelForTemplate
	for _, w := range watches {
		if w.Id == channelID {
			currentChannel = &ChannelForTemplate{
				ID:       w.Id,
				Name:     w.Name,
				Platform: w.Platform,
			}
			break
		}
	}

	// Fetch specific condition
	cond := Conditions{}
	condition := cond.GetCondition(conditionID)

	condLogicJSON, _ := json.Marshal(condition.ConditionLogic)
	deviceActionParamsJSON, _ := json.Marshal(condition.DeviceActionParams)
	condForTemplate := &ConditionForTemplate{
		ID:                 condition.Id,
		Name:               condition.Name,
		EventType:          condition.EventType,
		Filter:             condition.Filter,
		ConditionLogic:     string(condLogicJSON),
		IsEnabled:          condition.IsEnabled,
		LastTriggeredAt:    condition.LastTriggeredAt,
		DeviceID:           condition.DeviceId,
		DeviceAction:       condition.DeviceAction,
		DeviceActionParams: string(deviceActionParamsJSON),
	}

	// Fetch condition templates for this event type
	eventMeta := EventMetadata{}
	templatesResponse := eventMeta.GetTemplatesForEvent(currentChannel.Platform, condition.EventType)

	return &ConditionPageData{
		CurrentChannel:     currentChannel,
		Condition:          condForTemplate,
		PlatformMeta:       GetPlatformMetadata(cond),
		EventFieldOptions:  GetEventFieldOptions(cond, currentChannel.Platform, condition.EventType, translator),
		ConditionTemplates: templatesResponse.Templates,
		//		ConditionProperties:     templatesResponse.Properties,
	}
}

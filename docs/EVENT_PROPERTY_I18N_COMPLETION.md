# Event Property i18n Translation Implementation - Historical

> Superseded by [CONDITION_SCHEMA_I18N.md](CONDITION_SCHEMA_I18N.md). The portal now resolves condition-event fields with `condition.schema.{platform}.{field}.label` and `.description`; the former `condition.eventProp.*` namespace was removed.

## Problem Statement
The condition page's event parameter selection showed incomplete or untranslated options when loading available parameters via the API endpoint `GET /platform-config/platforms/{platform}/events/{event}/parameters/available`. The backend had just expanded property support from 11 to 82+ properties, but:

1. Missing i18n translations for most parameters
2. Incorrect translation key format in the backend lookup
3. Parameter dropdown appeared empty or showed raw property names

## Solution Implemented

### 1. Comprehensive i18n Translations Added ✅
Added full i18n support for all 82 event properties across 7 languages:

**Languages:**
- English (en)
- German (de)
- Spanish (es)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)

**Total Translations:** 164 keys per language file (82 properties × 2 - label + description)

### 2. Properties Supported (82 Total)

#### Common Properties (16)
- `message` - Event message content
- `sender_id` - Platform user ID
- `sender_name` - Display name
- `sender_avatar` - Profile picture URL
- `badges` - User badges array
- `id`, `watch_target_id`, `platform`, `event_type`
- `is_member`, `is_mod`, `is_broadcaster`, `is_gift`, `is_anonymous`
- `created_at`, `received_at`, `timestamp`

#### Amount/Monetary Properties (5)
- `amount_value` - Numeric amount
- `amount_currency` - Currency code
- `amount_display` - Formatted display
- `point` - Points value
- `diamond_count` - Diamond cost

#### Gift Properties (10)
- `gift_id`, `gift_name`, `gift_message`, `gift_image_url`
- `gift_bar_current_level`, `gift_bar_next_level_reward`
- `gift_bar_remaining_points`, `gift_bar_required_points`
- `gift_type`, `item_id`, `item_name`

#### Modifier/Style Properties (5)
- `modifier_position` - Danmaku/display position
- `modifier_size` - Text size
- `modifier_color` - Text color
- `modifier_font` - Font type
- `modifier_opacity` - Text opacity

#### NicoNico Specific Properties (28)
- Comment properties: `content`, `user_id`, `user_id_hashed`, `user_name`, `vpos`, `comment_no`, `account_status`
- Operator comment: `operator_comment`, `link`
- Gift/Donation: `advertiser_user_id`, `advertiser_name`, `contribution_rank`, `item_id`, `item_name`
- Notifications: `notification_type`
- Emotion/Reaction: All emotion fields
- Cruise, Ranking, Comment Lock, Comment Mode
- Game Update, Fingerprint, Trial Panel, Program Status
- Tag Updates, Marquee, Enquete, Statistics fields
- Individual metrics: `viewers`, `comments`, `adPoints`, `giftPoints`, `timeshiftReservations`

#### Platform Specific Properties (12)
- Twitch: `is_anonymous`, `amount_value`
- Bilibili: `color`, `position`, `size`
- TikTok: `gift_id`, `count`, `diamond_count`
- Facebook: `comment_id`, `reaction_type`
- Kick: `gift_type`

#### Status/State Properties (6)
- `status` - Current status
- `state` - State value
- `layout` - Layout mode
- `owner_locked` - Lock status
- `panel_type` - Panel type
- `unqualified_user` - Qualification status

#### Statistics Properties (11)
- `viewers` - Viewer count
- `comments` - Comment count
- `adPoints` - Ad points total
- `giftPoints` - Gift points total
- `timeshiftReservations` - Timeshift reservations
- `total_ad_point`, `latest_point`, `latest_advertiser`
- `ranking_advertiser`, `ranking_position`, `ranking_rank`
- Plus individual metric properties

### 3. Backend Code Updates ✅

**File: `internal/controller/template.go`**

Updated `GetEventFieldOptions()` function to:
- Fetch available parameters from platform config API
- Look up translations using correct key format: `"condition.eventProp.{name}.label"`
- Handle missing translations gracefully (fallback to property name)
- Return translated EventFieldOption objects for template rendering

**Key Change:**
```go
// Old: translator.T("condition." + param.Name)
// New: translator.T("condition.eventProp." + param.Name + ".label")
```

### 4. i18n File Structure

Each property has two i18n entries:

```json
"condition.eventProp.{property_name}.label": "Display Label",
"condition.eventProp.{property_name}.description": "Longer description of what this property represents"
```

**Example (message property):**
```json
// English
"condition.eventProp.message.label": "Message",
"condition.eventProp.message.description": "Message content attached to the event"

// German
"condition.eventProp.message.label": "Nachricht",
"condition.eventProp.message.description": "Nachrichteninhalt des Ereignisses"

// Japanese
"condition.eventProp.message.label": "メッセージ",
"condition.eventProp.message.description": "イベントに添付されたメッセージ内容"
```

### 5. Template Integration

The template `templates/pages/condition.html` (line 161) uses the EventFieldOptions:

```html
<select id="textEnvSelect">
    {{range .EventFieldOptions}}
    <option value="{{.Name}}" data-translation-key="condition.eventProp.{{.Name}}.label">
        {{.Label}}
    </option>
    {{end}}
</select>
```

The `.Label` value now contains the translated text thanks to the updated `GetEventFieldOptions()` function.

## Files Modified

### i18n Files (7 total)
- `internal/i18n/locales/en.json` - English translations
- `internal/i18n/locales/de.json` - German translations
- `internal/i18n/locales/es.json` - Spanish translations
- `internal/i18n/locales/fr.json` - French translations
- `internal/i18n/locales/ja.json` - Japanese translations
- `internal/i18n/locales/ko.json` - Korean translations
- `internal/i18n/locales/zh.json` - Chinese translations

### Backend Files (1 total)
- `internal/controller/template.go` - Updated `GetEventFieldOptions()` function

### Documentation Files (1 total)
- `docs/live_event_and_property_keys.txt` - Backend property definitions (reference)

## Verification Results

✅ All 7 i18n JSON files validated successfully
✅ Go code compilation successful
✅ 164 translation keys per language file (82 × 2)
✅ Translation key format consistent across all languages
✅ Backend function properly integrated with i18n system

## User-Facing Impact

1. **Condition Parameter Dropdown**: Now displays all 82 properties with translated labels
2. **Language Support**: Labels appear in user's selected language (7 languages supported)
3. **Description Availability**: Each property has a description for reference (currently unused but available)
4. **Graceful Fallback**: If translation missing, property name is shown

## Testing Recommendations

1. Open condition detail page
2. Verify text parameter selector dropdown shows all properties
3. Check labels are translated in different language settings
4. Confirm no untranslated property names appear
5. Test with different platforms/event types to ensure variety

## Technical Notes

- Translation keys use hierarchical naming: `condition.eventProp.{property}.{field}`
- Fallback chain: Translation lookup → Property name → Empty
- No breaking changes to existing functionality
- Backward compatible with code that doesn't use i18n

## Source Data

All property definitions extracted from `/docs/live_event_and_property_keys.txt` which contains the backend's platform event schema definitions. This ensures frontend and backend property definitions stay synchronized.

## Future Improvements

1. Consider caching translated options to reduce lookup overhead
2. Add description field display in UI tooltips
3. Sync property definitions automatically from backend API during deployment

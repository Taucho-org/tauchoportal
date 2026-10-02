# Frontend Condition Implementation Checklist

## Quick Reference: What Frontend Must Set to Create a Condition

This document summarizes the minimum viable data structure for condition creation.

---

## 1. Basic Condition Metadata

```json
{
  "watch_id": "watch_123abc",                    // ✅ REQUIRED: Must match existing WatchTarget.id
  "name": "My Condition Name",                   // ✅ REQUIRED: Human-readable label
  "event_type": "superchat",                     // ✅ REQUIRED: See list below
  "filter": "brightness",                        // ❌ OPTIONAL: Keyword substring match in event data
  "is_enabled": true,                            // ❌ OPTIONAL: Default true
  "device_group_id": "dg_lights_main"            // ✅ REQUIRED: Must match existing DeviceGroup.id
}
```

**Valid event_type values:**
- `comment` (chat message)
- `superchat` (paid donation)
- `follow` (channel follow)
- `member` (new member)
- `sub` (subscription)
- `cheer` (bits donation)
- `gift` (gift subscription)
- `sticker` (sticker sent)
- `nicoru` (Niconico-specific)
- `hype_train` (YouTube Hype Train)
- `raid` (channel raid)
- `stream_start` / `stream_end`

---

## 2. Device Control Template

```json
{
  "device_action_body": {
    "method": "POST",                            // HTTP method
    "url": "https://api.govee.com/v1/control",  // API endpoint
    "headers": {                                 // Optional auth headers
      "Authorization": "Bearer TOKEN"
    },
    "body": {                                    // Request body payload
      "device": "{device_id}",                   // Auto-filled: Device ID
      "model": "{model_id}",                     // Auto-filled: Device model
      "cmd": {
        "name": "brightness",
        "value": 128                             // Will be replaced by extracted value
      }
    }
  }
}
```

**Rules:**
1. Must include both `{device_id}` and `{model_id}` placeholders (auto-filled)
2. Must include `{brand}` placeholder if needed
3. Exactly ONE field will be replaced with extracted event value
4. Must be valid JSON object (map)

---

## 3. Flexible Parameter Configuration

```json
{
  "device_action_param_name": "body.cmd.value",        // ✅ REQUIRED
  
  "device_action_param_evaluator": {                   // ✅ REQUIRED
    "operator": "REGEX_EXTRACT",
    "variables": ["brightness:(\\d+)"]
  }
}
```

### `device_action_param_name`
- **Format:** Dot-notation path to the field to replace in template
- **Examples:**
  - `"body.cmd.value"` → `device_action_body.body.cmd.value`
  - `"body.brightness"` → `device_action_body.body.brightness`
  - `"headers.Authorization"` → `device_action_body.headers.Authorization`

### `device_action_param_evaluator`
- **Purpose:** Extract dynamic value from event data
- **Simplest form (direct extraction):**
  ```json
  {"operator": "PARAM", "variables": ["event_field_name"]}
  ```
- **With transformation (regex):**
  ```json
  {"operator": "REGEX_EXTRACT", "variables": ["pattern(\\d+)"]}
  ```

---

## 4. Extraction Operators (Most Common)

| Operator | Example | Result |
|----------|---------|--------|
| `PARAM` | `{"operator": "PARAM", "variables": ["amount"]}` | Extract `event.amount` directly |
| `REGEX_EXTRACT` | `{"operator": "REGEX_EXTRACT", "variables": ["brightness:(\\d+)"]}` | Extract digits after "brightness:" from text |
| `COLOR_PICKUP` | `{"operator": "COLOR_PICKUP", "variables": ["message"]}` | Find color name in text, convert to RGB |
| `PARSEINT` | `{"operator": "PARSEINT", "variables": ["count"]}` | Parse string to integer |
| `MULTIPLY` | `{"operator": "MULTIPLY", "variables": ["amount", "10"]}` | Multiply value by 10 |
| `ADD` | `{"operator": "ADD", "variables": ["base_value", "50"]}` | Add 50 to value |

---

## 5. Optional Advanced Filtering

```json
{
  "condition_logic": {
    "operator": "AND",
    "subconditions": [
      {"operator": "GREATER_THAN", "variables": ["amount", "5"]},
      {"operator": "INCLUDES", "variables": ["message", "brightness"]}
    ]
  }
}
```

Only include this if you need complex filtering beyond event type + filter keyword.

---

## Complete Minimal Example

```json
{
  "watch_id": "watch_abc123",
  "name": "Chat Brightness Control",
  "event_type": "comment",
  "device_group_id": "dg_lights",
  "is_enabled": true,
  
  "device_action_body": {
    "method": "POST",
    "url": "https://api.govee.com/v1/devices/control",
    "body": {
      "device": "{device_id}",
      "model": "{model_id}",
      "brightness": 128
    }
  },
  
  "device_action_param_name": "body.brightness",
  
  "device_action_param_evaluator": {
    "operator": "REGEX_EXTRACT",
    "variables": ["brightness:(\\d+)"]
  }
}
```

---

## Frontend Form Layout (Suggested)

### Section 1: Trigger Setup
- [ ] Dropdown: Select Watch Target (load from `GET /watch-targets`)
- [ ] Dropdown: Select Event Type (hardcoded list of 14 types)
- [ ] Text Input: Optional Keyword Filter (leave empty = match all)
- [ ] Toggle: Enabled/Disabled

### Section 2: Device Control
- [ ] Dropdown: Select Device Group (load from `GET /device-groups`)
- [ ] Display: Show devices in selected group (info only, from `GET /device-groups/{id}`)
- [ ] Display: Show credentials available (info only, from `GET /user-device-credentials`)

### Section 3: Template Builder
- [ ] JSON Editor: Device Action Body Template
  - Provide template snippets for different brands
  - Show placeholders available: `{device_id}`, `{model_id}`, `{brand}`
  - Validate: Must be valid JSON
  - Validate: Must include both placeholders
- [ ] Path Selector: Device Action Param Name
  - Auto-populate from fields in the template
  - Use dot notation
  - Validate: Path must exist in template

### Section 4: Parameter Extraction
- [ ] Dropdown: Extraction Operator (PARAM, REGEX_EXTRACT, COLOR_PICKUP, PARSEINT, MULTIPLY, ADD, etc.)
- [ ] Dynamic Input: Variables (based on selected operator)
  - PARAM: Single event field name
  - REGEX_EXTRACT: Regex pattern with capture groups
  - MULTIPLY/ADD: Two values
  - COLOR_PICKUP: Event field name
- [ ] Help Text: Show example for selected operator

### Section 5: Advanced (Optional Collapse)
- [ ] Complex Condition Logic Builder (optional)
- [ ] Test Button (calls `POST /conditions/test-draft`)
  - Show result: matched (true/false)
  - Show result: extracted value
  - Show result: would trigger (true/false)

### Section 6: Actions
- [ ] Save Button (calls `POST /conditions`)
- [ ] Success/Error Message Display

---

## Key API Endpoints Frontend Needs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/watch-targets` | Load list of watches to select from |
| GET | `/device-groups` | Load list of device groups |
| GET | `/device-groups/{id}` | Get devices in selected group (for display) |
| GET | `/user-device-credentials` | Verify credentials exist for group's devices |
| GET | `/device-brand-templates?id=X` | (Optional) Load brand template examples |
| POST | `/conditions/test-draft` | Test condition before saving |
| POST | `/conditions` | Create condition |
| GET | `/conditions?watch_id=X` | List conditions for a watch |
| GET | `/conditions/get?id=X` | Get single condition details |
| PATCH | `/conditions/{id}` | Update condition |
| DELETE | `/conditions/{id}` | Delete condition |

---

## Validation Rules (Frontend Should Enforce)

### Field Validation

| Field | Rule |
|-------|------|
| `watch_id` | Must not be empty, must exist in user's watches |
| `name` | Must not be empty, min 3 chars, max 255 chars |
| `event_type` | Must be from predefined list |
| `device_group_id` | Must not be empty, must belong to user |
| `device_action_body` | Must be valid JSON object, must contain `{device_id}` and `{model_id}` |
| `device_action_param_name` | Must not be empty, must be valid dot notation path, path must exist in body template |
| `device_action_param_evaluator.operator` | Must not be empty, must be valid operator name |
| `device_action_param_evaluator.variables` | Must have correct number of values for operator |

### Pre-Creation Checks

- [ ] Device group has at least one device
- [ ] Device group's devices have credentials configured (matching by brand)
- [ ] Device action body is valid JSON
- [ ] Device action param name path exists in body
- [ ] Parameter evaluator operator is valid
- [ ] Event type is supported (hardcoded list)

### Test Before Save (Recommended)

- [ ] Call `POST /conditions/test-draft` with sample event data
- [ ] Verify: `matched: true` or `would_trigger: true`
- [ ] Verify: `flexible_parameter_value` looks correct
- [ ] Only then call POST `/conditions` to save

---

## Error Handling

### Expected Error Responses

```json
{
  "error": "device_action_param_name 'body.cmd.value' not found in device_action_body",
  "status": 400
}
```

**Common Errors:**
- `Missing required fields: watch_id, name, event_type` → User didn't fill basic fields
- `Invalid event_type` → event_type not in list
- `Watch target not found` → watch_id doesn't exist or isn't user's
- `device_action_body must be a JSON object` → Template syntax error
- `device_action_param_name 'X' not found in device_action_body` → Path doesn't exist

**Error Display:**
- Show error message in a toast/alert
- Highlight the problematic field(s)
- Provide hint on how to fix (e.g., "Check your template JSON syntax")

---

## Data Flow Diagram

```
Frontend UI
    ↓
1. User fills out condition form
    ↓
2. Frontend validates all fields
    ↓
3. Frontend calls POST /conditions/test-draft (optional but recommended)
    ↓
4. Backend evaluates with sample event, returns: matched + extracted_value
    ↓
5. If test passes, frontend shows preview to user
    ↓
6. User clicks Save → Frontend calls POST /conditions
    ↓
7. Backend persists condition in database
    ↓
8. Condition is now LIVE and will trigger on stream events
```

---

## Template Examples by Brand

### Govee (Brightness Control)
```json
{
  "method": "POST",
  "url": "https://api.govee.com/v1/devices/control",
  "headers": {"Govee-Token": "YOUR_API_KEY"},
  "body": {
    "device": "{device_id}",
    "model": "{model_id}",
    "cmd": {"name": "brightness", "value": 128}
  }
}
```

### Nanoleaf (Color Control)
```json
{
  "method": "PUT",
  "url": "https://api.nanoleaf.me/v1/devices/{device_id}/effects",
  "headers": {"Authorization": "Bearer TOKEN"},
  "body": {
    "model": "{model_id}",
    "color": "#FF0000"
  }
}
```

### WLED (Local Network)
```json
{
  "method": "POST",
  "url": "http://DEVICE_IP:80/json/state",
  "body": {
    "on": true,
    "bri": 255
  }
}
```

### Custom Devices
```json
{
  "method": "POST",
  "url": "https://your.api.com/control",
  "headers": {"Authorization": "Bearer YOUR_TOKEN"},
  "body": {
    "device": "{device_id}",
    "action": "set_brightness",
    "value": 128
  }
}
```

---

## Testing Checklist

- [ ] Create condition with all required fields
- [ ] Test endpoint returns `would_trigger: true`
- [ ] Extracted value looks correct
- [ ] Go live on stream
- [ ] Trigger the event (comment, superchat, etc.)
- [ ] Device receives and executes the action within 2 seconds
- [ ] Check backend logs for errors if it doesn't work
- [ ] Verify device group has credentials for all devices
- [ ] Verify device group devices are online

---

## Support & Debugging

**If device doesn't execute:**
1. Check: Condition is `is_enabled: true`
2. Check: Device group has at least 1 device
3. Check: Device has credentials configured
4. Check: Event type matches actual event
5. Check: Filter keyword matches event content (if filter set)
6. Run test endpoint manually with sample data
7. Check backend logs: `tail -f server.log | grep condition`

**If wrong value injected:**
1. Verify event field exists: Check event payload from platform
2. Verify evaluator operator: Test with `POST /conditions/test-draft`
3. Verify template path: Check `device_action_param_name` matches template structure


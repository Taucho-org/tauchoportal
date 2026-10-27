# Device Action Configuration - Data Flow Diagram

## Complete Flow from Modal to Submit

```
┌─────────────────────────────────────────────────────────────────┐
│  CONDITION PAGE - sendingParameterArea (Top Section)            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Select Device Group: [dropdown ▼]                         │ │
│  │ (Shows: Group A, Group B, Group C)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─> onGroupSelected()
                              │   ├─> Fetch device info
                              │   └─> openModal()
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  MODAL - deviceActionModal (Popup Dialog)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Select Template: [Govee Brightness ▼]                     │ │
│  │                                                             │ │
│  │ Parameters:                                                │ │
│  │  brightness (Static): [100      ]                         │ │
│  │  color (Flexible): [ConditionEditor ...]                 │ │
│  │                                                             │ │
│  │              [Cancel]  [✓ OK]                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─> User clicks OK
                              │
                              ▼
              deviceActionHandler.saveAndClose()
                              │
                              ├─> updateJsonFromForm()
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Validate & Assemble │
                    │ Device Action Body  │
                    └─────────────────────┘
                              │
                    ┌─────────────────────┐
                    │ Build JSON Object:  │
                    │ {                   │
                    │  device_group_id,   │
                    │  device_action_body,│
                    │  param_name,        │
                    │  param_evaluator    │
                    │ }                   │
                    └─────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │ Save to sendingparamjson textarea:   │
        │ jsonTextarea.value = JSON.stringify()│
        └──────────────────────────────────────┘
                              │
                              ▼
                    closeModal()
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONDITION PAGE - Back to Main View                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Select Device Group: [Group A (selected)]                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ JSON EDITOR (Advanced) - Now Contains:                    │ │
│  │ {                                                         │ │
│  │   "device_group_id": "group_123",                        │ │
│  │   "device_action_body": {                                │ │
│  │     "method": "POST",                                    │ │
│  │     "url": "https://...",                               │ │
│  │     "headers": {...},                                   │ │
│  │     "body": {...}                                       │ │
│  │   },                                                     │ │
│  │   "device_action_param_name": "body.brightness",        │ │
│  │   "device_action_param_evaluator": {...}               │ │
│  │ }                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Test Condition]  [Submit]                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─> User clicks Submit
                              │
                              ▼
                    submitCondition()
                              │
        ┌─────────────────────┴──────────────────┐
        ▼                                        ▼
  Parse JSON from textarea        Validate all fields
  Extract:                         - device_action_body
  - device_action_body            - param_name
  - device_action_param_name      - param_evaluator
  - device_action_param_evaluator - operator in list
                                   - path exists
                                   - placeholders present
        │                                        │
        └─────────────────────┬──────────────────┘
                              ▼
              ┌──────────────────────────────┐
              │ POST /api/conditions          │
              │ {                            │
              │   name, event_type,          │
              │   condition_logic,           │
              │   device_action_body,        │
              │   device_action_param_name,  │
              │   device_action_param_...,   │
              │   watch_id (POST only)       │
              │ }                            │
              └──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Backend Response │
                    │ Condition saved! │
                    └──────────────────┘
                              │
                              ▼
                Redirect to conditions list
```

---

## Data Structure at Each Stage

### 1. Modal Configuration
```javascript
// In memory (DeviceActionHandler)
this.selectedGroupId = "group_123"
this.selectedTemplateId = "govee_brightness"
this.selectedTemplate = {
  http_method: "POST",
  endpoint_url: "https://...",
  body_template: {...},
  ...
}
this.parameterConfigs = {
  "body.brightness": {
    mode: "static",
    value: 100
  },
  "body.color": {
    mode: "flexible",
    evaluator: { operator: "MULTIPLY", variables: [...] }
  }
}
```

### 2. After updateJsonFromForm()
```javascript
// In sendingparamjson textarea
{
  "device_group_id": "group_123",
  "device_action_body": {
    "method": "POST",
    "url": "https://...",
    "headers": {...},
    "body": {
      "device": {"id": "{device_id}", "model": "{model_id}"},
      "brightness": 100,          // Static value set
      "color": null               // Placeholder for flexible
    }
  },
  "device_action_param_name": "body.color",
  "device_action_param_evaluator": {
    "operator": "MULTIPLY",
    "variables": ["extracted_value"],
    "subconditions": [...]
  }
}
```

### 3. submitCondition() Extracts
```javascript
const parsed = JSON.parse(sendingparamjson.value)
const deviceActionBody = parsed.device_action_body
const deviceActionParamName = parsed.device_action_param_name
const deviceActionParamEvaluator = parsed.device_action_param_evaluator
```

### 4. Final API Request
```json
{
  "name": "Condition Name",
  "event_type": "superchat",
  "is_enabled": true,
  "condition_logic": {...},
  "device_action_body": {
    "method": "POST",
    "url": "https://...",
    "headers": {...},
    "body": {...}
  },
  "device_action_param_name": "body.color",
  "device_action_param_evaluator": {...},
  "watch_id": "channel_123"
}
```

---

## Key Data Points

| Component | Source | Stored In | Used By |
|-----------|--------|-----------|---------|
| device_group_id | User selection | textarea JSON | submitCondition() |
| device_action_body.method | Template API | textarea JSON | submitCondition() |
| device_action_body.url | Template API | textarea JSON | submitCondition() |
| device_action_body.headers | Template API | textarea JSON | submitCondition() |
| device_action_body.body | Template + user params | textarea JSON | submitCondition() |
| device_action_param_name | User selection (path) | textarea JSON | submitCondition() |
| device_action_param_evaluator | User builds with ConditionEditor | textarea JSON | submitCondition() |

---

## Fixed: OK Button Flow

```
User clicks OK
   │
   ▼
saveAndClose()
   │
   ├─ updateJsonFromForm()
   │  │
   │  ├─ Build params object
   │  │  ├─ device_group_id from this.selectedGroupId
   │  │  ├─ device_action_body from template + configs
   │  │  └─ device_action_param_name, evaluator from configs
   │  │
   │  ├─ Validate structure (logs errors but continues)
   │  │
   │  └─ **SAVE: this.jsonTextarea.value = JSON.stringify(params)**  ✅
   │
   ├─ closeModal()
   │
   └─ Modal closes, textarea now has full JSON ✅
```

**Before Fix:** Early return prevented textarea update ❌  
**After Fix:** Always updates textarea even with validation warnings ✅

---

## Verification Steps

To verify the fix works:

1. Open condition page
2. Select device group → Modal opens
3. Select template → Parameters load
4. Configure parameters (set static value, make one flexible)
5. Click OK → **Modal closes**
6. **Check:** Look at sendingparamjson textarea (bottom)
   - Should contain JSON object
   - Should have device_group_id
   - Should have device_action_body with full structure
   - Should have device_action_param_name and device_action_param_evaluator
7. Click Submit
   - Should validate and submit successfully
   - Check browser console for any validation warnings


# Device Action Architecture - Visual Diagrams

**Purpose:** Visual explanation of how device action templates flow from frontend to backend to execution

---

## 1. Template Selection & Assembly Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND UI                              │
│                                                                   │
│  Option A: Select Preset Template          Option B: Custom JSON│
│  ┌──────────────────────────────────┐       ┌──────────────────┐│
│  │ Template Dropdown ▼              │       │ JSON Textarea    ││
│  │ ├─ Govee Brightness              │       │ ┌──────────────┐ ││
│  │ ├─ Nanoleaf Color                │       │ │{             │ ││
│  │ ├─ WLED Brightness               │       │ │  "method":   │ ││
│  │ └─ Custom...                     │       │ │  "url": "...",│ ││
│  │                                  │       │ │  "body": {...}│ ││
│  │ [Select Govee Brightness]        │       │ │}              │ ││
│  └──────────────────────────────────┘       └──────────────────┘│
│               ⬇ GET /device-brand-         ⬇ User enters full  │
│                  templates?id=8                 structure       │
└─────────────────────────────────────────────────────────────────┘
         ⬇                                               ⬇
    ┌────────────────────────────────┐  ┌───────────────────────────┐
    │   Backend Response:            │  │   Frontend Custom Template│
    │  {                             │  │  {                        │
    │    "http_method": "POST",      │  │    "method": "POST",      │
    │    "endpoint_url": "https://", │  │    "url": "https://...",  │
    │    "body_template": "{...}",   │  │    "headers": {...},      │
    │    "parameter_defaults": {     │  │    "body": {...}          │
    │      "headers": {...}          │  │  }                        │
    │    }                           │  │                           │
    │  }                             │  │                           │
    └────────────────────────────────┘  └───────────────────────────┘
         ⬇                                     ⬇
    ┌────────────────────────────────────────────────────────────┐
    │           FRONTEND TEMPLATE ASSEMBLY                       │
    │                                                             │
    │  completeTemplate = {                                      │
    │    method: templateResponse.http_method,                   │
    │    url: templateResponse.endpoint_url,                     │
    │    headers: templateResponse.parameter_defaults.headers,   │
    │    body: JSON.parse(templateResponse.body_template)        │
    │  }                                                          │
    │                                                             │
    │  OR (for custom):                                          │
    │                                                             │
    │  completeTemplate = JSON.parse(userJSON)                   │
    └────────────────────────────────────────────────────────────┘
         ⬇
    ┌────────────────────────────────────────────────────────────┐
    │           USER EDITS BODY PORTION                          │
    │                                                             │
    │  completeTemplate.body = {                                 │
    │    "device": "{device_id}",                                │
    │    "model": "{model_id}",                                  │
    │    "cmd": {                                                │
    │      "name": "brightness",                                 │
    │      "value": 100  ← User changes this                     │
    │    }                                                        │
    │  }                                                          │
    └────────────────────────────────────────────────────────────┘
         ⬇
    ┌────────────────────────────────────────────────────────────┐
    │         FRONTEND SUBMITS TO BACKEND                        │
    │                                                             │
    │  POST /conditions {                                        │
    │    watch_id: "watch_123",                                  │
    │    name: "Brightness Control",                             │
    │    event_type: "superchat",                                │
    │    device_group_id: "dg_lights",                           │
    │    device_action_body: completeTemplate,  ← COMPLETE!     │
    │    device_action_param_name: "body.cmd.value",            │
    │    device_action_param_evaluator: {...}                   │
    │  }                                                          │
    └────────────────────────────────────────────────────────────┘
```

---

## 2. Parameter Configuration Form Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    PARAMETER EXTRACTION UI                        │
│                                                                    │
│  "Field to Replace (dot notation):"                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ body.cmd.value                                              │ │
│  │ ⬆ Auto-populate from template structure                     │ │
│  │ ⬆ Validate path exists in device_action_body.body          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  "Extract From Event:"                                            │
│  ┌──────────────────────────┐                                     │
│  │ Operator: [PARAM ▼]      │  ← Dropdown only shows:            │
│  │ ├─ PARAM                 │     • PARAM                        │
│  │ ├─ REGEX_EXTRACT         │     • REGEX_EXTRACT               │
│  │ ├─ COLOR_PICKUP          │     • COLOR_PICKUP                │
│  │ ├─ MULTIPLY              │     • MULTIPLY                    │
│  │ ├─ ADD                   │     • ADD                         │
│  │ └─ PARSEINT              │     • PARSEINT                    │
│  │                          │     • etc (14 extraction ops)    │
│  └──────────────────────────┘     NOT: AND, OR, GREATER_THAN  │
│                                                                    │
│  Variables (depends on operator):                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Field Name: [amount]                                        │ │
│  │ ⬆ If PARAM operator: single field name                      │ │
│  │ ⬆ Examples: "amount", "message", "sender_name"              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [Test with Sample Event]                                         │
│  If PARAM with "amount" field:                                    │
│    ✅ Would extract: event.amount                                │
│    📝 Sample: If event.amount = 5 → value becomes 5             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Execution Flow: From Event to Device

```
STREAM EVENT HAPPENS
        ⬇
┌───────────────────────────────────┐
│ Event: {                          │
│   event_type: "superchat",       │
│   amount: 5,                      │
│   message: "Great stream!",       │
│   sender_name: "viewer123"        │
│ }                                 │
└───────────────────────────────────┘
        ⬇
CONDITION EVALUATOR (listener/evaluator.go)
        ⬇
┌────────────────────────────────────────────────────┐
│ PHASE 1: Event Type Match?                         │
│ ✅ event_type == "superchat" ✓                     │
│ ✅ filter "" (empty, so match all) ✓              │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ PHASE 2: Condition Logic (if present)              │
│ ✅ Complex logic evaluated ✓                       │
└────────────────────────────────────────────────────┘
        ⬇
ACTION EXECUTOR (device/condition_executor.go)
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 1: Evaluate Parameter Evaluator               │
│                                                     │
│ device_action_param_evaluator: {                   │
│   operator: "PARAM",                               │
│   variables: ["amount"]                            │
│ }                                                   │
│                                                     │
│ Evaluate using logic engine:                       │
│ → Extract event.amount                             │
│ → Result: 5                                        │
│ → flexibleParamValue = 5                           │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 2: Clone Template                             │
│                                                     │
│ FROM: {                                             │
│   method: "POST",                                  │
│   url: "https://api.govee.com/v1/control",        │
│   headers: {Govee-Token: "abc123"},               │
│   body: {                                          │
│     device: "{device_id}",                         │
│     model: "{model_id}",                           │
│     cmd: { name: "brightness", value: 0 }         │
│   }                                                │
│ }                                                   │
│                                                     │
│ TO (cloned): same structure ✓                      │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 3: Inject Parameter at Path                   │
│                                                     │
│ Path: "body.cmd.value"                             │
│ Value: 5                                           │
│                                                     │
│ Clone[body][cmd][value] = 5                        │
│                                                     │
│ Result: {                                          │
│   method: "POST",                                  │
│   url: "https://...",                             │
│   headers: {...},                                  │
│   body: {                                          │
│     device: "{device_id}",                         │
│     model: "{model_id}",                           │
│     cmd: { name: "brightness", value: 5 }         │
│   }                                                │
│ }                                                   │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 4: For Each Device in Group                   │
│                                                     │
│ devices = [                                        │
│   { id: "govee_abc123", model: "H6159", ... },    │
│   { id: "govee_def456", model: "H6160", ... }    │
│ ]                                                   │
└────────────────────────────────────────────────────┘
        ⬇
        FOR device in devices:
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 5: Fill Device Placeholders                   │
│                                                     │
│ Device: { id: "govee_abc123", model: "H6159" }    │
│                                                     │
│ Replace in template:                               │
│ {device_id} → "govee_abc123"                       │
│ {model_id} → "H6159"                               │
│ {brand} → "govee"                                  │
│                                                     │
│ Result: {                                          │
│   method: "POST",                                  │
│   url: "https://...",                             │
│   headers: {...},                                  │
│   body: {                                          │
│     device: "govee_abc123",                        │
│     model: "H6159",                                │
│     cmd: { name: "brightness", value: 5 }         │
│   }                                                │
│ }                                                   │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ STEP 6: Send HTTP Request                          │
│                                                     │
│ POST https://api.govee.com/v1/control             │
│ Headers: {                                         │
│   "Govee-Token": "abc123",                         │
│   "Content-Type": "application/json"               │
│ }                                                   │
│ Body (JSON): {                                     │
│   "device": "govee_abc123",                        │
│   "model": "H6159",                                │
│   "cmd": { "name": "brightness", "value": 5 }    │
│ }                                                   │
│                                                     │
│ ✅ Response: 200 OK                               │
└────────────────────────────────────────────────────┘
        ⬇
┌────────────────────────────────────────────────────┐
│ REPEAT STEP 4-6 for next device in group           │
│ (if multiple devices: govee_def456, etc)           │
└────────────────────────────────────────────────────┘
        ⬇
DEVICE EXECUTES
        ⬇
┌────────────────────────────────────────────────────┐
│ Smart Light Response:                              │
│ ✅ Brightness set to 5                            │
│ ✅ Status: Online                                 │
└────────────────────────────────────────────────────┘
```

---

## 4. Data Structure Transformation Examples

### Example 1: Govee Brightness Control

```
PRESET TEMPLATE from GET /device-brand-templates?id=8
┌──────────────────────────────────────────────┐
│ {                                            │
│   "id": 8,                                   │
│   "http_method": "POST",                     │
│   "endpoint_url": "https://api.govee.com/..." │
│   "body_template":                           │
│     "{                                       │
│       \"device\": \"{device_id}\",           │
│       \"model\": \"{model_id}\",             │
│       \"cmd\": {                             │
│         \"name\": \"brightness\",            │
│         \"value\": 0                         │
│       }                                      │
│     }"                                       │
│   "parameter_defaults": {                    │
│     "headers": {                             │
│       "Govee-Token": "{{API_KEY}}"           │
│     }                                        │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘

FRONTEND ASSEMBLY
┌──────────────────────────────────────────────┐
│ const deviceActionBody = {                   │
│   method: "POST",                            │
│   url: "https://api.govee.com/v1/control",   │
│   headers: {                                 │
│     "Govee-Token": "user_api_key_123"        │
│   },                                         │
│   body: {                                    │
│     "device": "{device_id}",                 │
│     "model": "{model_id}",                   │
│     "cmd": {                                 │
│       "name": "brightness",                  │
│       "value": 0                             │
│     }                                        │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘

FRONTEND SUBMISSION
┌──────────────────────────────────────────────┐
│ POST /conditions {                           │
│   device_action_body: deviceActionBody,      │
│   device_action_param_name: "body.cmd.value", │
│   device_action_param_evaluator: {           │
│     operator: "PARAM",                       │
│     variables: ["amount"]                    │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘

BACKEND STORAGE (in database)
┌──────────────────────────────────────────────┐
│ Condition {                                  │
│   device_action_body: {                      │
│     method: "POST",                          │
│     url: "https://api.govee.com/v1/control", │
│     headers: {                               │
│       "Govee-Token": "user_api_key_123"      │
│     },                                       │
│     body: {                                  │
│       device: "{device_id}",                 │
│       model: "{model_id}",                   │
│       cmd: {                                 │
│         name: "brightness",                  │
│         value: 0                             │
│       }                                      │
│     }                                        │
│   },                                         │
│   device_action_param_name: "body.cmd.value", │
│   device_action_param_evaluator: {...}      │
│ }                                            │
└──────────────────────────────────────────────┘

EXECUTION
┌──────────────────────────────────────────────┐
│ 1. Extract: event.amount → 5                │
│ 2. Inject: cmd.value = 5                    │
│ 3. Fill: device_id, model_id                │
│ 4. Send HTTP POST with body:                │
│    {                                         │
│      device: "govee_abc123",                 │
│      model: "H6159",                         │
│      cmd: {                                  │
│        name: "brightness",                   │
│        value: 5                              │
│      }                                       │
│    }                                         │
└──────────────────────────────────────────────┘
```

---

## 5. Parameter Extraction Operators - Data Flow

```
EXTRACTION OPERATOR TYPES AND EXAMPLES

┌─────────────────────────────────────────────────────────────┐
│ DIRECT EXTRACTION                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ PARAM: Extract field directly from event                   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { amount: 5, message: "Great!", ... }          │ │
│ │ Operator: { operator: "PARAM", variables: ["amount"] }│ │
│ │ Result: 5                                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TEXT EXTRACTION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ REGEX_EXTRACT: Extract pattern from text                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { message: "brightness:150 please" }           │ │
│ │ Operator: { operator: "REGEX_EXTRACT",                │ │
│ │             variables: ["brightness:(\\d+)"] }        │ │
│ │ Result: 150                                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ COLOR_PICKUP: Extract color name, convert to RGB          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { message: "make it red please" }              │ │
│ │ Operator: { operator: "COLOR_PICKUP",                 │ │
│ │             variables: ["message"] }                  │ │
│ │ Result: "#FF0000"                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ SUBSTRING: Extract by character range                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { message: "!cmd brightness 200" }             │ │
│ │ Operator: { operator: "SUBSTRING",                    │ │
│ │             variables: ["15-18"] }  ← chars 15-18     │ │
│ │ Result: "200"                                          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ FIRST/LAST: Extract first/last N characters              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { message: "255" }                             │ │
│ │ FIRST(2): "25"  LAST(1): "5"                          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CONVERSION OPERATORS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ PARSEINT: Convert string to integer                        │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { message: "50" } (string)                     │ │
│ │ Operator: { operator: "PARSEINT",                     │ │
│ │             variables: ["message"] }                  │ │
│ │ Result: 50 (integer)                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MATHEMATICAL OPERATORS                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ADD: Base + offset                                         │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { amount: 100 }                                │ │
│ │ Operator: { operator: "ADD",                          │ │
│ │             variables: ["100", "50"] }                │ │
│ │ Calculation: 100 + 50 = 150                           │ │
│ │ Result: 150                                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ MULTIPLY: Base × scale factor                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Event: { amount: 5 } (dollars)                        │ │
│ │ Operator: { operator: "MULTIPLY",                     │ │
│ │             variables: ["5", "25"] }                  │ │
│ │ Calculation: 5 × 25 = 125 brightness                 │ │
│ │ Result: 125                                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ DIVIDE, SUBTRACT, MODULO: Similar pattern                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Dot Notation Path Navigation

```
TEMPLATE STRUCTURE
┌──────────────────────────────────────┐
│ device_action_body: {                │
│   "method": "POST",                  │
│   "url": "https://...",              │
│   "headers": {                       │
│     "Authorization": "Bearer abc"    │
│   },                                 │
│   "body": {                          │
│     "device": "{device_id}",         │
│     "config": {                      │
│       "cmd": {                       │
│         "name": "brightness",        │
│         "value": 128                 │
│       }                              │
│     }                                │
│   }                                  │
│ }                                    │
└──────────────────────────────────────┘

DOT NOTATION PATHS

Path: "method"
Target: device_action_body.method
Value: "POST"

Path: "url"
Target: device_action_body.url
Value: "https://..."

Path: "headers.Authorization"
Target: device_action_body.headers.Authorization
Value: "Bearer abc"

Path: "body.device"
Target: device_action_body.body.device
Value: "{device_id}"

Path: "body.config.cmd.name"
Target: device_action_body.body.config.cmd.name
Value: "brightness"

Path: "body.config.cmd.value"
Target: device_action_body.body.config.cmd.value
Value: 128  ← Most common flexible parameter location

VALIDATION RULE:
✅ Path MUST exist in device_action_body
❌ Cannot create new fields (path must point to existing field)
❌ Frontend validates this before submission
```

---

## 7. Multi-Device Execution (Future Multi-Parameter Consideration)

```
If Frontend Needs Multiple Flexible Parameters:

CONDITION: {
  device_action_body: {
    method: "POST",
    url: "...",
    body: {
      brightness: 0,      ← Parameter 1
      color: "#000000"    ← Parameter 2
    }
  },
  device_action_params: [    ← WOULD BE ARRAY
    {
      param_name: "body.brightness",
      param_evaluator: { operator: "PARAM", variables: ["amount"] }
    },
    {
      param_name: "body.color",
      param_evaluator: { operator: "COLOR_PICKUP", variables: ["message"] }
    }
  ]
}

EXECUTION LOGIC:

For each parameter config in device_action_params:
  1. Evaluate param_evaluator with event
  2. Extract value
  3. Inject at param_name path
  4. Continue to next parameter

FOR each device in group:
  1. Fill device placeholders
  2. Send complete request

EXAMPLE:
Event: { amount: 5, message: "make it red" }

Param 1: extract amount → 5 → inject at body.brightness
Param 2: extract color from message → #FF0000 → inject at body.color

Result sent to device:
{
  brightness: 5,
  color: "#FF0000"
}

STATUS: Not implemented yet (Phase 2 enhancement)
ESTIMATE: 4-6 hours if needed
```

---

## Summary of Key Flows

1. ✅ **Template Assembly:** Frontend combines method + url + headers from preset/custom
2. ✅ **Parameter Configuration:** User specifies ONE path + one extraction method
3. ✅ **Event Processing:** Event triggers → extract value → inject → execute
4. ✅ **Multi-Device:** Loop executes for each device in group
5. ⚠️ **Multiple Parameters:** Currently not supported, Phase 2 enhancement

**All diagrams show current implementation (single parameter)**

When multi-parameter support is needed, see "Multi-Device Execution" section for planned logic.

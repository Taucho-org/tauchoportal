# Condition System - Frontend Documentation Summary

**Last Updated:** September 23, 2025

This folder contains comprehensive documentation for frontend developers to implement the condition UI for triggering smart device actions from stream events.

---

## 📚 Documentation Files

### For Quick Learning (Start Here)
1. **`CONDITION_API_QUICK_REFERENCE.md`** ⭐ **START HERE**
   - One-page quick reference
   - 3-step condition creation flow
   - Common extractors and examples
   - Most essential info at a glance
   - ~5 min read

2. **`FRONTEND_CONDITION_IMPLEMENTATION_CHECKLIST.md`** 
   - Detailed form field layout guide
   - Complete validation checklist
   - Form section recommendations
   - Error handling guide
   - ~15 min read

### For Comprehensive Understanding
3. **`FRONTEND_CONDITION_API_GUIDE.md`**
   - Complete API reference documentation
   - All 30+ extraction operators explained
   - Event type/field reference for all platforms
   - Advanced condition logic examples
   - Complete API endpoint reference
   - ~30 min read

---

## 🎯 What Frontend Must Implement

### Core Data to Collect from User

```javascript
{
  // Basic trigger setup
  watch_id: string,              // User selects from dropdown
  name: string,                  // User enters
  event_type: string,            // User selects from 14 options
  filter: string,                // Optional keyword filter
  is_enabled: boolean,           // Toggle
  
  // Device control
  device_group_id: string,       // User selects from dropdown
  
  // Template-based action (ALL REQUIRED)
  device_action_body: object,    // JSON editor
  device_action_param_name: string,  // Dot notation path selector
  device_action_param_evaluator: object  // Logic operator + variables
}
```

### 3-Phase Implementation

**Phase 1: Trigger Selection**
- Watch target dropdown
- Event type dropdown (14 predefined types)
- Optional keyword filter input
- Enabled/disabled toggle

**Phase 2: Device Selection**
- Device group dropdown
- Info display: devices in group + their credentials

**Phase 3: Action Template**
- JSON editor for device action body
  - Show placeholders: `{device_id}`, `{model_id}`, `{brand}`
  - Validate: must be valid JSON object
- Dot-notation path input for parameter replacement
  - Validate: path must exist in template
- Operator dropdown for extraction method
  - Show operator-specific variable inputs
  - Display example for selected operator

---

## 🔑 Key Concepts

### Event Types (14 Total)
Stream events the condition listens for. Each has different available fields:

| Type | Common Fields |
|------|---------------|
| `comment` | `message`, `sender_name` |
| `superchat` | `amount`, `message`, `sender_name` |
| `follow` | `sender_name` |
| `member`/`sub` | `tier`, `message`, `sender_name` |
| `cheer`/`gift` | `amount`, `sender_name` |
| `raid` | `sender_name`, `viewer_count` |

### Device Action Body Template
Request template for the device API. Frontend builds this in JSON editor:

```json
{
  "method": "POST",
  "url": "https://api.example.com/control",
  "body": {
    "device": "{device_id}",    // Auto-filled
    "model": "{model_id}",      // Auto-filled
    "brightness": 128           // Will be replaced
  }
}
```

**Validation:**
1. Must be valid JSON object
2. Must include `{device_id}` and `{model_id}` placeholders
3. Must have at least one field to replace

### Dot Notation Path
Path to the field that receives the dynamic value:

```
device_action_body:
  body:
    brightness: 128

device_action_param_name: "body.brightness"  ← Points here
```

### Extraction Operators
How to extract value from event:

| Operator | Purpose | Example |
|----------|---------|---------|
| `PARAM` | Extract field directly | `event.amount` |
| `REGEX_EXTRACT` | Regex pattern match | Extract "brightness:80" from text |
| `COLOR_PICKUP` | Color name conversion | "red" → "#FF0000" |
| `MULTIPLY` | Scale value | `amount * 10` |
| `ADD` | Offset value | `amount + 50` |
| `PARSEINT` | String to integer | "50" → 50 |

---

## 🛠️ Form Layout

### Recommended UI Structure

```
┌─────────────────────────────────────────────────────┐
│ CONDITION EDITOR                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Basic Settings                                      │
│ ───────────────                                     │
│ Name: [Condition Name________]                      │
│ Enabled: [Toggle ON]                               │
│                                                     │
│ Event Trigger                                       │
│ ─────────────                                       │
│ Watch: [Select Watch ▼]                             │
│ Event Type: [superchat ▼]                           │
│ Filter: [optional keyword] (OR leave empty)         │
│                                                     │
│ Devices to Control                                  │
│ ──────────────────                                  │
│ Device Group: [Select Group ▼]                      │
│ Devices in group:                                   │
│  • Living Room Light (govee)                        │
│  • Bedroom Light (govee)                            │
│ Credentials: ✓ govee API key configured            │
│                                                     │
│ Device Control Template                             │
│ ─────────────────────────                           │
│ ┌─────────────────────────────────────────────────┐│
│ │{                                                 ││
│ │  "method": "POST",                              ││
│ │  "url": "https://api.govee.com/v1/control",    ││
│ │  "body": {                                      ││
│ │    "device": "{device_id}",                    ││
│ │    "cmd": {"name": "brightness", "value": 128}││
│ │  }                                              ││
│ │}                                                 ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Parameter Extraction                                │
│ ──────────────────                                  │
│ Field to Replace:                                   │
│ [body.cmd.value     ]                               │
│ (Help: Must exist in template above ✓)              │
│                                                     │
│ Extract From Event:                                 │
│ Operator: [PARAM ▼]                                 │
│ (Help: Extract event field directly)                │
│ Variables: [amount]                                 │
│ (Help: Available fields: amount, message, ...)      │
│                                                     │
│ [Help] [Test] [Save] [Cancel]                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Validation Checklist

Frontend should validate before calling POST /conditions:

```javascript
// Required fields
✓ watch_id is not empty
✓ name is not empty (min 3 chars)
✓ event_type is from valid list
✓ device_group_id is not empty

// Template validation
✓ device_action_body is valid JSON object
✓ device_action_body contains {device_id}
✓ device_action_body contains {model_id}
✓ device_action_param_name is not empty
✓ device_action_param_name path exists in body

// Evaluator validation
✓ device_action_param_evaluator.operator is not empty
✓ device_action_param_evaluator.variables has correct count

// Business logic
✓ Selected device group has ≥1 device
✓ Device group's devices have credentials configured
```

---

## 🧪 Testing Recommendations

### Before Saving

1. Click "Test" button
2. System calls `POST /conditions/test-draft`
3. Shows result: matched (true/false), extracted value
4. If `would_trigger: true`, safe to save
5. If error, show error message with hint

### After Saving

1. Go live on stream
2. Trigger the event (comment/superchat/etc)
3. Device should respond within 2 seconds
4. If not working:
   - Check device credentials exist
   - Check device group is not empty
   - Check event type is correct
   - Check backend logs

---

## 📋 API Endpoints Frontend Needs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/watch-targets` | Load watches for dropdown |
| GET | `/device-groups` | Load device groups for dropdown |
| GET | `/device-groups/{id}` | Get devices in group (info display) |
| GET | `/user-device-credentials` | Verify credentials exist |
| GET | `/device-brand-templates` | (Optional) Load template examples |
| POST | `/conditions/test-draft` | Test condition before saving |
| POST | `/conditions` | **Create condition** |
| GET | `/conditions?watch_id=X` | List conditions for watch |
| GET | `/conditions/get?id=X` | Get single condition details |
| PATCH | `/conditions/{id}` | Update condition |
| DELETE | `/conditions/{id}` | Delete condition |

---

## 🔥 Quick Integration Example

### 1. User Fills Form
```javascript
{
  watch_id: "watch_abc123",
  name: "Superchat Brightness",
  event_type: "superchat",
  device_group_id: "dg_lights",
  
  device_action_body: {
    method: "POST",
    url: "https://api.govee.com/v1/devices/control",
    body: {
      device: "{device_id}",
      model: "{model_id}",
      cmd: {name: "brightness", value: 100}
    }
  },
  
  device_action_param_name: "body.cmd.value",
  
  device_action_param_evaluator: {
    operator: "PARAM",
    variables: ["amount"]
  }
}
```

### 2. Frontend Tests
```javascript
POST /conditions/test-draft
{
  test_event: {
    event_type: "superchat",
    amount: 5,
    sender_name: "viewer123"
  },
  // ... include above fields
  trigger_real_device: false
}

Response: {
  matched: true,
  would_trigger: true,
  flexible_parameter_value: 5
}
```

### 3. Frontend Saves
```javascript
POST /conditions
{ ...same body as step 1... }

Response: {
  id: "cond_123...",
  status: 201
}
```

### 4. Live Event Happens
- User sends $5 superchat
- Evaluator extracts: `amount = 5`
- Injects into template: `body.cmd.value = 5`
- Sends to Govee API
- Light brightness sets to 5

---

## 🎓 Learning Path

1. **Start:** Read `CONDITION_API_QUICK_REFERENCE.md` (5 min)
2. **Implement:** Follow `FRONTEND_CONDITION_IMPLEMENTATION_CHECKLIST.md` (30 min)
3. **Deep Dive:** Study `FRONTEND_CONDITION_API_GUIDE.md` for all operators (30 min)
4. **Test:** Create sample condition, test it, go live

---

## 🚨 Common Pitfalls to Avoid

❌ **Wrong:** Template with literal placeholder string
```json
"device_action_body": {
  "value": "{brightness}"  // WRONG: stays literal
}
```

✅ **Right:** Let backend inject the value
```json
"device_action_body": {
  "value": 100  // Can be any type
},
"device_action_param_name": "value"  // Will be replaced
```

---

❌ **Wrong:** Using non-existent event field
```json
"device_action_param_evaluator": {
  "operator": "PARAM",
  "variables": ["donation_amount"]  // Doesn't exist!
}
```

✅ **Right:** Use correct field name for event type
```json
"device_action_param_evaluator": {
  "operator": "PARAM",
  "variables": ["amount"]  // Exists in superchat
}
```

---

## 📞 Need Help?

- **Architecture questions:** See `FRONTEND_CONDITION_API_GUIDE.md` (Concepts section)
- **Form layout help:** See `FRONTEND_CONDITION_IMPLEMENTATION_CHECKLIST.md` (Form sections)
- **API endpoint reference:** See any of the above docs (API section)
- **Testing examples:** See `CONDITION_API_QUICK_REFERENCE.md` (Examples section)

---

## 📝 Implementation Tracking

When implementing, track progress:

- [ ] Create watch dropdown
- [ ] Create event type dropdown with 14 options
- [ ] Create device group dropdown
- [ ] Display devices in selected group
- [ ] Create JSON editor for template
- [ ] Create dot-notation path input
- [ ] Create operator dropdown + variable inputs
- [ ] Add validation for all fields
- [ ] Add test button calling POST /conditions/test-draft
- [ ] Add save button calling POST /conditions
- [ ] Handle success/error responses
- [ ] Display condition list for watch
- [ ] Implement update/delete flows
- [ ] Test with real stream events

---

**Status:** Complete and ready for frontend implementation
**Last Review:** 2025-09-23
**API Status:** Stable ✅ Compilation: Passing ✅

# Condition + Device Control - Quick Reference

## In 30 Seconds

```
1. Create device group     → POST /device-groups
2. Add devices to group    → POST /devices (set device_group_id)
3. Create condition        → POST /conditions (with action template)
4. Event happens           → Condition triggers → Device executes
```

---

## Minimal Working Condition Example

```json
POST /conditions
{
  "watch_id": "watch_123",
  "name": "Super Chat Light",
  "event_type": "superchat",
  "device_group_id": "group_abc",
  
  "device_action_body": {
    "device_id": "{device_id}",
    "action": "brightness",
    "value": 0
  },
  "device_action_param_name": "value",
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]
  }
}
```

**Event:** Super chat for $10
**Result:** Brightness = 10

---

## Common Extractors

### Extract from Event Field
```json
{
  "operator": "PARAM",
  "variables": ["amount"]
}
```

### Extract Color Name → HEX
```json
{
  "operator": "COLOR_PICKUP",
  "subConditions": [
    { "operator": "PARAM", "variables": ["message"] }
  ]
}
```

### Regex Extract
```json
{
  "operator": "REGEX_EXTRACT",
  "variables": ["rgb\\((\\d+)\\)"],  // Extract number from "rgb(255)"
  "subConditions": [
    { "operator": "PARAM", "variables": ["message"] }
  ]
}
```

### Math: Multiply
```json
{
  "operator": "MULTIPLY",
  "variables": ["10"],  // amount * 10
  "subConditions": [
    { "operator": "PARAM", "variables": ["amount"] }
  ]
}
```

### Math: Add
```json
{
  "operator": "ADD",
  "variables": ["50"],  // amount + 50
  "subConditions": [
    { "operator": "PARAM", "variables": ["amount"] }
  ]
}
```

---

## Nested Template Paths

Use dot notation for nested fields:

```json
{
  "device_action_body": {
    "settings": {
      "lighting": {
        "brightness": 100
      }
    }
  },
  "device_action_param_name": "settings.lighting.brightness"
}
```

Event value → `settings.lighting.brightness = event_value`

---

## Event Types & Available Fields

| Event | Fields | Example |
|-------|--------|---------|
| `superchat` | amount, currency, message, sender_name | $5 super chat |
| `comment` | message, sender_name, likes | Chat comment |
| `follow` | sender_name | New follower |
| `member`/`sub` | tier, months, message, sender_name | New membership |
| `gift` | amount, message, sender_name | Gifted subs |
| `cheer` | amount, message, sender_name | Bits cheer |
| `raid` | amount, sender_name | Channel raid |

---

## Response Template

After creating, device receives merged request body:

```
Input Template:
{
  "cmd": { "name": "brightness", "value": 0 }
}

Extracted Value: 75
Param Path: "cmd.value"

Device Receives:
{
  "device_id": "aabbccdd",         // Auto-added
  "device_name": "Desk Light",     // Auto-added
  "brand": "govee",                // Auto-added
  "product_id": "govee-h6159",     // Auto-added
  "cmd": { 
    "name": "brightness", 
    "value": 75                    // Injected
  }
}
```

---

## Device Group Types

| Type | Behavior |
|------|----------|
| `PARALLEL` | All devices execute simultaneously |
| `SEQUENTIAL` | Devices rotate one-by-one on each trigger |
| `AFFINITY` | Each user gets assigned device (future) |

---

## Full Request Template

```json
{
  // Basic condition info
  "watch_id": "watch_xyz",
  "name": "My Condition",
  "event_type": "superchat",  // Required
  "is_enabled": true,
  
  // Filtering
  "filter": "!donation",  // Optional: keyword filter
  "condition_logic": {    // Optional: advanced conditions
    "operator": "GREATER_THAN",
    "variables": ["5"],
    "subConditions": [
      { "operator": "PARAM", "variables": ["amount"] }
    ]
  },
  
  // Device control
  "device_group_id": "group_abc",  // Required
  "device_action": "brightness",   // Optional label
  
  // Action template system
  "device_action_body": {                          // Required
    "device": "{device_id}",
    "cmd": {"name": "brightness", "value": 0}
  },
  "device_action_param_name": "cmd.value",         // Required
  "device_action_param_evaluator": {               // Required
    "operator": "PARAM",
    "variables": ["amount"]
  }
}
```

---

## Validation Rules

✅ Must provide:
- `watch_id`
- `name`
- `event_type`
- `device_group_id`
- `device_action_body` (JSON object)
- `device_action_param_name` (must exist in body)
- `device_action_param_evaluator` (with operator)

❌ Don't mix:
- Legacy `device_action_params` + new system (pick one)

---

## Error Examples

| Error | Fix |
|-------|-----|
| `device_action_param_name not found in template` | Check path exists in body |
| `condition has no device group` | Add `device_group_id` |
| `failed to evaluate flexible parameter` | Check event field name |
| `missing required parameter` | Add field to `device_action_body` |

---

## API Endpoints

```
POST   /conditions                  Create
GET    /conditions?watch_id=X       List by watch
GET    /conditions/get?id=X         Get one
PATCH  /conditions/update?id=X      Update
DELETE /conditions/delete?id=X      Delete
```

---

## Flow Diagram

```
Stream Event (e.g., $5 super chat)
        ↓
Condition Logic Match? → Filter: "keyword"
        ↓ YES
Extract Parameter: operator="PARAM", variables=["amount"] → 5
        ↓
Inject into Template at "cmd.value" → {cmd:{name:"brightness",value:5}}
        ↓
Merge Device Info → {..., device_id:"aabbccdd", product_id:"..."}
        ↓
For each device in group (type=PARALLEL):
  - Execute HTTP request
  - Record in audit log
        ↓
Done ✓
```


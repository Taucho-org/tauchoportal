# Frontend Guide: Condition + Device Control API

This guide explains how to use the new condition system to trigger smart device actions from stream events.

---

## Quick Overview

**Conditions** listen to stream events and automatically trigger smart device actions. You specify:
1. **When** to trigger: event type (chat, super chat, follow, etc.) + optional filter
2. **What to control**: device group ID
3. **How to control**: action template + flexible parameter from the event

---

## Step 1: Create a Device Group

Before creating a condition, you need a device group to control.

```
POST /device-groups
Content-Type: application/json

{
  "name": "Living Room Lights",
  "option": "sequential",
  "type": "PARALLEL"
}
```

**Response:**
```json
{
  "id": "group_1694275200000000000",
  "user_id": 42,
  "name": "Living Room Lights",
  "option": "sequential",
  "type": "PARALLEL",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Types:**
- `PARALLEL`: All devices execute at the same time
- `SEQUENTIAL`: Devices execute one by one in rotation
- `AFFINITY`: Each user gets a sticky device assignment (reserved for future use)

---

## Step 2: Register Devices in the Group

Add smart devices to your group:

```
POST /devices
Content-Type: application/json

{
  "name": "Bedroom Light",
  "brand": "govee",
  "product_id": "govee-h6159",
  "device_group_id": "group_1694275200000000000",
  "device_identifier": {
    "device_id": "aabbccdd1122",
    "model": "H6159"
  }
}
```

---

## Step 3: Create a Condition with Action Template

Now create a condition that triggers a device action when an event happens.

### Simple Example: Brightness on Super Chat

```
POST /conditions
Content-Type: application/json

{
  "watch_id": "watch_abc123",
  "name": "Super Chat Brightness",
  "event_type": "superchat",
  "device_group_id": "group_1694275200000000000",
  
  "device_action_body": {
    "device": "{device_id}",
    "model": "H6159",
    "cmd": {
      "name": "brightness",
      "value": "{brightness}"
    }
  },
  "device_action_param_name": "cmd.value",
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]
  },
  
  "is_enabled": true
}
```

### What happens:
1. **Event**: User sends $5 super chat (amount=5)
2. **Extract**: System extracts `event.amount = 5`
3. **Inject**: System injects into template at `cmd.value = 5`
4. **Execute**: Device receives:
   ```json
   {
     "device": "aabbccdd1122",
     "model": "H6159",
     "cmd": {
       "name": "brightness",
       "value": 5
     }
   }
   ```

---

## Template Parameters Explained

### `device_action_body` (Required)
**Type:** JSON object (template)

The request body template sent to your device. Use placeholders like:
- `{device_id}` - auto-filled with device ID
- `{device_name}` - auto-filled with device name
- `{brightness}` - placeholder for flexible parameter

```json
{
  "device": "{device_id}",
  "model": "H6159",
  "cmd": {
    "name": "brightness",
    "value": 0  // Will be replaced by flexible parameter
  }
}
```

### `device_action_param_name` (Required)
**Type:** String - path to flexible parameter using dot notation

Specifies which field in the template gets the dynamic value from the event.

**Examples:**
- `"cmd.value"` - Set `template.cmd.value = extracted_value`
- `"brightness"` - Set `template.brightness = extracted_value`
- `"color.rgb"` - Set `template.color.rgb = extracted_value`

### `device_action_param_evaluator` (Required)
**Type:** Condition logic object - how to extract value from event

The evaluator determines:
- Which event field to use
- How to transform it (regex, color conversion, calculation, etc.)

**Simplest form (just extract):**
```json
{
  "operator": "PARAM",
  "variables": ["amount"]
}
```

**With transformation (regex extract):**
```json
{
  "operator": "REGEX_EXTRACT",
  "variables": ["color:([a-f0-9]{6})"],
  "subConditions": [
    {
      "operator": "PARAM",
      "variables": ["message"]
    }
  ]
}
```

---

## Event Field Reference

Different event types expose different fields:

### `superchat` Event
- `amount` - Super Chat amount (number)
- `currency` - Currency code (string)
- `message` - Chat message (string)
- `sender_name` - Viewer name (string)

### `comment` Event
- `message` - Comment text (string)
- `sender_name` - Commenter name (string)
- `likes` - Like count (number)

### `follow` Event
- `sender_name` - Follower name (string)

### `member` / `sub` Event
- `tier` - Membership tier (string)
- `months` - Months subscribed (number)
- `message` - Member message (string)
- `sender_name` - Member name (string)

### Other Events (`cheer`, `gift`, `raid`, etc.)
- `sender_name` - User name (string)
- `amount` / `count` - Quantity (number)
- `message` - Associated message (string)

---

## Advanced Examples

### Color Change from Chat Message

Extract color name from chat message:

```json
{
  "watch_id": "watch_abc123",
  "name": "Chat Color Change",
  "event_type": "comment",
  "device_group_id": "group_1694275200000000000",
  
  "device_action_body": {
    "device": "{device_id}",
    "cmd": {
      "name": "color",
      "value": ""
    }
  },
  "device_action_param_name": "cmd.value",
  "device_action_param_evaluator": {
    "operator": "COLOR_PICKUP",
    "subConditions": [
      {
        "operator": "PARAM",
        "variables": ["message"]
      }
    ]
  }
}
```

**How it works:**
- Event message: "change to red"
- Evaluator extracts: "red"
- Converts to RGB: "FF0000"
- Device receives: `cmd.value = "FF0000"`

---

### Math Calculation: Gift Count × 10 = Brightness

```json
{
  "device_action_param_evaluator": {
    "operator": "MULTIPLY",
    "variables": ["10"],
    "subConditions": [
      {
        "operator": "PARAM",
        "variables": ["amount"]
      }
    ]
  }
}
```

**How it works:**
- Event: 5 gifts received
- Extract amount: 5
- Multiply by 10: 50
- Device brightness: 50

---

### Conditional: Only if Amount > $5

```json
{
  "condition_logic": {
    "operator": "GREATER_THAN",
    "variables": ["5"],
    "subConditions": [
      {
        "operator": "PARAM",
        "variables": ["amount"]
      }
    ]
  }
}
```

Add this to your condition creation request alongside the action template. Condition only triggers if logic matches.

---

## API Endpoints

### Create Condition
```
POST /conditions
{
  "watch_id": string (required)
  "name": string (required)
  "event_type": string (required) - comment|superchat|follow|sub|cheer|gift|...
  "filter": string (optional) - keyword filter on message
  "condition_logic": object (optional) - advanced filtering
  "device_group_id": string (required)
  "device_action": string (optional) - "on"|"off"|"color"|"brightness"|...
  
  "device_action_body": object (required) - template
  "device_action_param_name": string (required) - "cmd.value"|"brightness"|...
  "device_action_param_evaluator": object (required) - extraction logic
  
  "is_enabled": boolean (default: true)
}
```

### Get Condition
```
GET /conditions/get?id=<condition_id>
```

### List Conditions for Watch
```
GET /conditions?watch_id=<watch_id>
```

### Update Condition
```
PATCH /conditions/update?id=<condition_id>
{
  "name": "New Name",
  "device_action_body": { ... },
  "device_action_param_name": "...",
  "device_action_param_evaluator": { ... }
}
```

### Delete Condition
```
DELETE /conditions/delete?id=<condition_id>
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Template with placeholder instead of actual value
```json
{
  "device_action_body": {
    "cmd": "brightness",
    "value": "{brightness}"  // WRONG: stays literal string
  }
}
```

### ✅ Right: Use dot notation to specify where value goes
```json
{
  "device_action_body": {
    "cmd": "brightness",
    "value": 0  // Can be any type - will be replaced
  },
  "device_action_param_name": "value"  // Point to this field
}
```

---

### ❌ Wrong: Non-existent event field
```json
{
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["donation_amount"]  // This field doesn't exist!
  }
}
```

### ✅ Right: Use correct event field
```json
{
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]  // Exists in superchat events
  }
}
```

---

### ❌ Wrong: Forgetting device group
```json
{
  "name": "My Condition",
  "event_type": "superchat",
  "device_group_id": ""  // ERROR: empty!
}
```

### ✅ Right: Always provide device group
```json
{
  "name": "My Condition",
  "event_type": "superchat",
  "device_group_id": "group_1694275200000000000"
}
```

---

## Testing Your Condition

1. Set `is_enabled: true` when creating
2. Go live on your stream
3. Trigger the event (send super chat, comment, etc.)
4. Device should respond within 1-2 seconds
5. Check logs for errors if it doesn't work

---

## Troubleshooting

**Q: Device didn't execute when event happened**
- Check: Is the condition `is_enabled: true`?
- Check: Does the device have credentials configured?
- Check: Is the event type correct?
- Check: Did you pass the correct `watch_id`?

**Q: Wrong value got injected**
- Check: Does event field have the data? (Check platform docs)
- Check: Is `device_action_param_evaluator` correct?
- Check: Does `device_action_param_name` path exist in template?

**Q: Template syntax error**
- Check: Is `device_action_body` valid JSON?
- Check: Does `device_action_param_name` use correct dot notation?
- Example: `"cmd.settings.brightness"` navigates 3 levels deep

---

## Support

For API errors, check the response message. Common codes:
- `400 Bad Request` - Invalid template/parameters format
- `404 Not Found` - Watch ID or device group doesn't exist
- `500 Internal Server Error` - Backend error, check logs


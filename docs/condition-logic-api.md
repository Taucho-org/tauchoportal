# Condition Logic API — Detailed Specification

This document explains the **condition logic testing endpoints** and the **condition logic structure** for frontend developers implementing the condition builder UI.

---

## Overview

Conditions are rules that trigger device actions when specific stream events occur. The condition logic system supports complex nested logic trees with 22 operators for boolean logic, comparisons, text matching, and value extraction.

**Key principle:** The condition logic engine is **strict about JSON structure** to ensure predictable behavior. Invalid JSON structures are silently ignored (return `Matched=false`), but the frontend should **validate and construct clean JSON** before sending requests.

---

## 3 Testing Endpoints

### 1. POST `/conditions/test-draft` — Test Unsaved Logic

Test a draft condition logic tree without saving it. Useful for the condition builder's **"Test Logic"** button.

**Request:**
```json
{
  "condition_logic": { 
    "operator": "AND",
    "subconditions": [
      {
        "operator": "GREATER_THAN",
        "variables": ["100"],
        "subconditions": [
          {
            "operator": "PARAM",
            "variables": ["event_amount"]
          }
        ]
      },
      {
        "operator": "EQUALS",
        "variables": ["TestUser1"],
        "subconditions": [
          {
            "operator": "PARAM",
            "variables": ["event_sender_id"]
          }
        ]
      }
    ]
  },
  "test_event": {
    "id": "evt_123",
    "user_id": 1,
    "watch_target_id": "watch_1",
    "platform": "twitch",
    "event_type": "superchat",
    "message": "Love your stream!",
    "amount_value": 150,
    "amount_currency": "USD",
    "sender_name": "TestUser1",
    "sender_id": "user_456",
    "is_member": false,
    "is_mod": false,
    "badges": [],
    "received_at": "2026-06-12T15:52:47.672Z",
    "created_at": "2026-06-12T15:52:47.672Z"
  },
  "device_id": "dev_789",
  "device_action": "set_color",
  "device_action_params": {
    "brightness": 100
  },
  "trigger_real_device": false
}
```

**Response:**
```json
{
  "matched": true,
  "computed_values": ["150", "TestUser1"],
  "device_id": "dev_789",
  "device_action": "set_color",
  "device_action_params": {
    "brightness": 100,
    "computed_value": "150"
  },
  "would_trigger": true,
  "execution_result": null,
  "execution_error": null
}
```

**Parameters:**
- `condition_logic` (object) — The condition logic tree (see **Condition Logic Structure** section below)
- `test_event` (object) — A sample LiveEvent to test against
- `device_id` (string) — Device to trigger (if logic matches)
- `device_action` (string) — Action to execute (e.g., "set_color", "toggle")
- `device_action_params` (object, optional) — Static parameters for the device action
- `trigger_real_device` (boolean) — If `true`, actually execute the device action; if `false`, dry-run only

**Response fields:**
- `matched` — Whether the condition logic matched
- `computed_values` — Values extracted/computed by the logic tree (passed to device executor)
- `device_id`, `device_action`, `device_action_params` — Echo back the request
- `would_trigger` — `true` if logic matched and device would be called
- `execution_result` — Success message if device was executed (only if `trigger_real_device=true` and action succeeded)
- `execution_error` — Error message if device execution failed

---

### 2. POST `/conditions/{id}/test` — Test Existing Condition

Test a saved condition in the database by ID.

**Request:**
```json
{
  "test_event": {
    "id": "evt_123",
    "user_id": 1,
    "watch_target_id": "watch_1",
    "platform": "twitch",
    "event_type": "comment",
    "message": "Great content!",
    "amount_value": 0,
    "amount_currency": "USD",
    "sender_name": "StreamViewer",
    "sender_id": "user_789",
    "is_member": false,
    "is_mod": false,
    "badges": [],
    "received_at": "2026-06-12T15:52:47.672Z",
    "created_at": "2026-06-12T15:52:47.672Z"
  },
  "trigger_real_device": false
}
```

**Response:**
```json
{
  "condition_id": "cond_456",
  "condition_name": "High Spenders",
  "matched": true,
  "computed_values": [],
  "device_id": "dev_789",
  "device_action": "toggle",
  "device_action_params": {},
  "would_trigger": true,
  "execution_result": null,
  "execution_error": null
}
```

**Path parameters:**
- `{id}` — Condition ID to test

**Response fields:** Same as test-draft, plus:
- `condition_id` — ID of the tested condition
- `condition_name` — Name of the tested condition

---

### 3. POST `/conditions/test-all` — Test All User Conditions

Test all conditions for a user (or optionally for a specific watch) against a sample event.

**Request:**
```json
{
  "watch_target_id": "watch_1",
  "test_event": {
    "id": "evt_123",
    "user_id": 1,
    "watch_target_id": "watch_1",
    "platform": "twitch",
    "event_type": "superchat",
    "message": "Amazing!",
    "amount_value": 50,
    "amount_currency": "USD",
    "sender_name": "Supporter",
    "sender_id": "user_999",
    "is_member": true,
    "is_mod": false,
    "badges": ["subscriber"],
    "received_at": "2026-06-12T15:52:47.672Z",
    "created_at": "2026-06-12T15:52:47.672Z"
  },
  "trigger_real_device": false
}
```

**Response:**
```json
{
  "total_conditions": 3,
  "matched": 2,
  "triggered": 1,
  "errors": 0,
  "results": [
    {
      "condition_id": "cond_456",
      "condition_name": "High Spenders",
      "matched": true,
      "computed_values": ["50"],
      "device_id": "dev_789",
      "device_action": "set_color",
      "device_action_params": { "brightness": 100 },
      "would_trigger": true,
      "execution_result": null,
      "execution_error": null
    },
    {
      "condition_id": "cond_789",
      "condition_name": "Members Only",
      "matched": true,
      "computed_values": [],
      "device_id": "dev_999",
      "device_action": "toggle",
      "device_action_params": {},
      "would_trigger": true,
      "execution_result": null,
      "execution_error": null
    }
  ]
}
```

**Query parameters:**
- `watch_target_id` (optional) — If provided, only test conditions for this watch. If omitted, tests all user conditions.

**Response fields:**
- `total_conditions` — Total conditions tested
- `matched` — Number that matched the event
- `triggered` — Number that would trigger (and device call would succeed)
- `errors` — Number that had execution errors
- `results` — Array of individual condition test results (same shape as test-draft response)

---

## Condition Logic Structure

The condition logic tree is a **recursive JSON structure** where each node represents an operation.

### Node Structure

```json
{
  "operator": "AND",
  "variables": ["value1", "value2"],
  "subconditions": [
    { "operator": "...", "variables": [...], "subconditions": [...] }
  ]
}
```

**Fields:**
- `operator` (string, required) — The operation type (see **Operators** section below)
- `variables` (array of strings, optional) — Input values for the operator (format depends on operator type)
- `subconditions` (array of nodes, optional) — Child nodes to evaluate

### Operator Categories

#### 1. Boolean Operators

**AND** (`"AND"`)
- Evaluates all subconditions
- Returns `true` if **all** match, `false` if any don't match
- Empty subconditions → `false`

**OR** (`"OR"`)
- Evaluates all subconditions
- Returns `true` if **any** match, `false` if none match
- Empty subconditions → `false`

**NOT** (`"NOT"`)
- Evaluates the single subcondition
- Returns `true` if it matches, inverted
- Missing subcondition → `true`

**Example:**
```json
{
  "operator": "AND",
  "subconditions": [
    {
      "operator": "GREATER_THAN",
      "variables": ["100"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_amount"]
        }
      ]
    },
    {
      "operator": "EQUALS",
      "variables": ["VIP_User"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_sender_name"]
        }
      ]
    }
  ]
}
```

#### 2. Comparison Operators

**EQUALS** (`"EQUALS"`)
- Compares extracted value against `variables[0]`
- **Exact string match** — case-sensitive
- `"red"` does NOT match `"Armored_Pikachu"` (no substring matching)
- If unable to compare, returns `false` silently

**GREATER_THAN** (`"GREATER_THAN"`)
- Tries numeric comparison first: extracted value > `variables[0]`
- Falls back to string comparison if non-numeric
- `"150" > "100"` → `true` (numeric)
- If unable to compare, returns `false`

**LESS_THAN** (`"LESS_THAN"`)
- Opposite of GREATER_THAN
- `"50" < "100"` → `true` (numeric)

**Example:**
```json
{
  "operator": "GREATER_THAN",
  "variables": ["100"],
  "subconditions": [
    {
      "operator": "PARAM",
      "variables": ["event_amount"]
    }
  ]
}
```
*(Matches if event amount > 100)*

#### 3. Text Operators

**INCLUDES** (`"INCLUDES"`)
- Case-insensitive substring match
- `"hello"` matches `"Hello World"` ✅
- `"hello"` matches `"HELLO"` ✅
- Requires extracted value + `variables[0]`

**REGEX_MATCH** (`"REGEX_MATCH"`)
- Case-sensitive regex pattern match
- `variables[0]` is a regular expression
- `"^test.*"` matches `"test123"` ✅
- `"^test.*"` does NOT match `"Test123"` (case-sensitive)
- Invalid regex patterns are silently ignored

**Example:**
```json
{
  "operator": "OR",
  "subconditions": [
    {
      "operator": "INCLUDES",
      "variables": ["red"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_message"]
        }
      ]
    },
    {
      "operator": "INCLUDES",
      "variables": ["blue"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_message"]
        }
      ]
    }
  ]
}
```
*(Matches if message includes "red" OR "blue")*

#### 4. Calculation Operators

**ADD** (`"ADD"`)
- Adds all numeric values from subconditions
- Non-numeric values are skipped
- Returns the sum

**SUBTRACT** (`"SUBTRACT"`)
- Subtracts `variables[0]` from the extracted value
- `extracted_value - variables[0]`

**SUM** (`"SUM"`)
- Sums all values from subconditions
- (Same as ADD)

**MULTIPLY** (`"MULTIPLY"`)
- Multiplies extracted value by `variables[0]`

**DIVIDE** (`"DIVIDE"`)
- Divides extracted value by `variables[0]`
- **Division by zero returns error** (non-fatal)

**MODULO** (`"MODULO"`)
- Modulo: extracted value % `variables[0]`
- **Modulo by zero returns error** (non-fatal)

**PARSEINT** (`"PARSEINT"`)
- Converts extracted value to integer
- Returns `false` if not parseable

**Example:**
```json
{
  "operator": "ADD",
  "subconditions": [
    { "operator": "PARAM", "variables": ["event_amount"] },
    { "operator": "PARAM", "variables": ["bonus_amount"] }
  ]
}
```
*(Returns sum of two amounts)*

#### 5. Extraction Operator

**PARAM** (`"PARAM"`)
- Extracts a field from the LiveEvent
- `variables[0]` is the field name
- **Must be a leaf node** — cannot have child operators like EQUALS as parents
- Returns extracted value

**Valid field names:**
- `event_message` — Chat message text
- `event_amount` — Donation/superchat amount (numeric)
- `event_amount_currency` — Currency code (e.g., "USD")
- `event_amount_display` — Formatted amount display
- `event_sender_name` — Sender display name
- `event_sender_id` — Sender user ID
- `event_sender_avatar` — Sender avatar URL
- `event_is_member` — Is channel member (boolean)
- `event_is_mod` — Is moderator (boolean)
- `event_badges` — Array of badge strings
- `event_type` — Event type (e.g., "comment", "superchat", "gift")
- `event_platform` — Platform name (e.g., "twitch", "youtube")
- `event_id` — Event ID
- `event_watch_id` — Associated watch ID
- `event_user_id` — User ID (owner of the watch)
- `event_stream_id` — Stream ID
- `event_received_at` — Timestamp when received
- `event_created_at` — Timestamp when event occurred

**Example:**
```json
{
  "operator": "PARAM",
  "variables": ["event_sender_name"]
}
```
*(Extracts the sender's name)*

---

## Error Handling & Validation

### Silent Failures (Non-Fatal)

The condition logic engine is **lenient with user data**. Invalid structures don't raise exceptions; they're silently treated as `Matched=false`:

- Unknown operators → `false`
- Missing required subconditions → `false`
- Non-numeric values for numeric operators → `false`
- Unknown PARAM field names → `false`
- Missing or malformed variables → `false`

### Critical Errors (Logged)

These are explicitly handled:

- **Division by zero** in DIVIDE operator → returns error (non-fatal, treated as no-match)
- **Modulo by zero** in MODULO operator → returns error (non-fatal)
- **Invalid regex pattern** in REGEX_MATCH → treated as no-match

### Frontend Validation

**To ensure clean JSON and prevent wasted API calls, the frontend should:**

1. **Validate operator names** — Only allow known operators from the list above
2. **Validate subcondition structure** — Each operator should have appropriate subconditions:
   - Boolean operators (AND/OR/NOT) → array of condition nodes
   - Comparison operators (EQUALS/GREATER_THAN/LESS_THAN) → single PARAM node
   - Text operators (INCLUDES/REGEX_MATCH) → single PARAM node
   - Calculation operators (ADD/SUBTRACT/etc.) → array of value-extracting nodes (PARAM or other calculations)
   - Extraction (PARAM) → no subconditions (leaf node)
3. **Validate variables** — Ensure proper types (usually strings) and required counts
4. **Prevent invalid hierarchies** — Don't allow PARAM as a child of AND/OR — comparison operators like GREATER_THAN should be parents of PARAM

### Example of Invalid JSON (Silently Rejected)

```json
{
  "operator": "AND",
  "subconditions": [
    {
      "operator": "PARAM",
      "variables": ["event_sender_name"]
    },
    {
      "operator": "PARAM",
      "variables": ["event_amount"]
    }
  ]
}
```

**Why it's invalid:**
- PARAM nodes should not be direct children of AND/OR
- Should wrap them in comparison operators like EQUALS or GREATER_THAN

**Correct version:**
```json
{
  "operator": "AND",
  "subconditions": [
    {
      "operator": "EQUALS",
      "variables": ["TestUser"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_sender_name"]
        }
      ]
    },
    {
      "operator": "GREATER_THAN",
      "variables": ["100"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_amount"]
        }
      ]
    }
  ]
}
```

---

## Value Passing to Devices

When condition logic matches, extracted/computed values are passed to the device executor:

```json
{
  "computed_values": ["150", "TestUser1"],
  "device_action_params": {
    "brightness": 100,
    "computed_value": "150"
  }
}
```

- **First computed value** becomes `device_action_params["computed_value"]`
- Device executor decides how to use this value based on the action type
- Example: `set_color` action might use the value as a color code, brightness level, etc.

---

## LiveEvent Structure

The `test_event` parameter follows the LiveEvent model:

```json
{
  "id": "evt_123",
  "user_id": 1,
  "watch_target_id": "watch_1",
  "platform": "twitch",
  "event_type": "superchat",
  "message": "Love your stream!",
  "amount_value": 150,
  "amount_currency": "USD",
  "amount_display": "$150.00 USD",
  "sender_name": "TestUser1",
  "sender_id": "user_456",
  "sender_avatar": "https://...",
  "is_member": false,
  "is_mod": false,
  "badges": ["founder"],
  "received_at": "2026-06-12T15:52:47.672Z",
  "created_at": "2026-06-12T15:52:47.672Z"
}
```

**Required fields for testing:**
- `event_type` — Must match the condition's event_type
- `platform` — Platform name (e.g., "twitch", "youtube")
- Other fields should be populated based on what the logic tree expects

---

## Best Practices

### For Frontend Developers

1. **Dry-run first** — Always test with `trigger_real_device: false` before executing
2. **Validate early** — Catch JSON structure errors in the UI before sending to API
3. **Show computed values** — Display what the logic extracted to help users debug
4. **Handle all 22 operators** — But provide sensible UI for common patterns (AND/OR, comparisons, text matching)
5. **Test edge cases** — Empty messages, zero amounts, missing badges, etc.

### For Device Integrations

1. **Handle multiple values** — Devices may receive `computed_value` from various extraction operators
2. **Type conversions** — Values from logic are always strings; convert as needed for the device API
3. **Graceful fallback** — If computed value is invalid for the device, use the static `device_action_params` instead

---

## Examples

### Example 1: High Spender Alert
```json
{
  "operator": "GREATER_THAN",
  "variables": ["100"],
  "subconditions": [
    {
      "operator": "PARAM",
      "variables": ["event_amount"]
    }
  ]
}
```
*(Triggers if donation amount > $100)*

### Example 2: VIP or Mod Message
```json
{
  "operator": "OR",
  "subconditions": [
    {
      "operator": "EQUALS",
      "variables": ["true"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_is_mod"]
        }
      ]
    },
    {
      "operator": "EQUALS",
      "variables": ["true"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_is_member"]
        }
      ]
    }
  ]
}
```
*(Triggers if sender is mod OR member)*

### Example 3: Mention Keyword (Case-Insensitive)
```json
{
  "operator": "INCLUDES",
  "variables": ["awesome"],
  "subconditions": [
    {
      "operator": "PARAM",
      "variables": ["event_message"]
    }
  ]
}
```
*(Triggers if message includes "awesome" (case-insensitive))*

### Example 4: Complex: High Spender with Red Color Comment
```json
{
  "operator": "AND",
  "subconditions": [
    {
      "operator": "GREATER_THAN",
      "variables": ["50"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_amount"]
        }
      ]
    },
    {
      "operator": "INCLUDES",
      "variables": ["red"],
      "subconditions": [
        {
          "operator": "PARAM",
          "variables": ["event_message"]
        }
      ]
    }
  ]
}
```
*(Triggers if amount > $50 AND message includes "red")*

---

## Questions & Support

For issues with:
- **Condition logic structure** → Check the **Operator Categories** section and validate your JSON
- **Test endpoint responses** → Compare against example responses above
- **Device integration** — Contact device team for `device_action` and `device_action_params` specifications

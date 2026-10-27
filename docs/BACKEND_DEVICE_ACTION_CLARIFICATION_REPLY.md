# Backend Device Action Configuration - Clarifications & Design Decisions

**Date:** September 23, 2025  
**Purpose:** Respond to frontend's FRONTEND_DEVICE_ACTION_CLARIFICATION.md with architectural decisions  
**Status:** Design phase - no code changes yet, settling requirements

---

## Executive Summary

The current backend implementation uses **inline template-based execution** where:
- Conditions store complete `device_action_body` (method, url, headers, body)
- Single flexible parameter per condition (currently limited)
- Frontend can provide custom templates OR select from device brand templates
- Template merging happens on frontend before submission to backend

This document confirms the architecture and addresses frontend's 7 clarifications.

---

## 1️⃣ Device Action Body Structure - Template Merging Process

### ✅ CONFIRMED: **Option A - Backend Receives Complete HTTP Template**

**Current Architecture:**
- Frontend is responsible for assembling the complete HTTP request template
- Backend stores full template in `device_action_body`
- Backend does NOT do template merging; frontend does

**Data Flow:**

```
Frontend:
1. User selects device brand template OR enters custom JSON
2. If template selected:
   - GET /device-brand-templates?id={template_id}
   - Returns: method, url, headers, body_template
   - Frontend merges these into complete object
3. Frontend lets user edit body portion
4. Frontend assembles complete structure:
   {
     "method": "POST",
     "url": "https://api.govee.com/v1/control",
     "headers": {"Authorization": "Bearer TOKEN"},
     "body": {
       "device": "{device_id}",
       "cmd": {"name": "brightness", "value": 0}
     }
   }
5. Sends to backend as-is in device_action_body
```

**Why This Design:**
- ✅ Backend remains stateless (doesn't need to fetch templates)
- ✅ Frontend has full control over what gets sent
- ✅ Allows custom headers/authentication per condition
- ✅ Simpler execution logic on backend (no merging)
- ✅ More flexibility for users to customize templates

### Device Brand Template Endpoint

**GET /device-brand-templates?id={template_id}**

Expected Response:
```json
{
  "id": 8,
  "brand_name": "govee",
  "template_name": "Govee Brightness Control",
  "category": "brightness",
  "http_method": "POST",
  "endpoint_url": "https://api.govee.com/v1/devices/control",
  "authentication_type": "api_key",
  "body_template": "{\"device\":\"{device_id}\",\"model\":\"{model_id}\",\"cmd\":{\"name\":\"brightness\",\"value\":0}}",
  "required_parameters": ["device_id", "model_id"],
  "parameter_defaults": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"
    }
  },
  "auth_header": "Govee-Token",
  "requires_authentication": true,
  "supports_batch_commands": false,
  "local_network_only": false,
  "examples": {
    "sample_request": {...}
  }
}
```

**Frontend Assembly Process:**

```javascript
// 1. Get template
template = GET /device-brand-templates?id=8

// 2. Merge into complete structure
deviceActionBody = {
  method: template.http_method,           // "POST"
  url: template.endpoint_url,             // "https://..."
  headers: template.parameter_defaults?.headers || {},
  body: JSON.parse(template.body_template)
}

// 3. Let user edit the body portion
// User changes: body.cmd.value from 0 to editable

// 4. Send complete object to backend
POST /conditions {
  device_action_body: deviceActionBody,
  device_action_param_name: "body.cmd.value",
  device_action_param_evaluator: {...}
}
```

---

## 2️⃣ Custom Template Parameter Handling

### ✅ CONFIRMED: **Option B - Single Flexible Parameter for Custom Templates**

**Current Implementation:**
- Custom templates support exactly ONE flexible parameter
- Reason: Keeps custom templates simple and focused

**How It Works:**

```json
// User enters full HTTP JSON in textarea
{
  "method": "POST",
  "url": "https://my-api.com/control",
  "headers": {"Authorization": "Bearer TOKEN"},
  "body": {
    "device_id": "{device_id}",
    "action": "brightness",
    "value": 100  // ← Will be replaced
  }
}

// Specify flexible parameter:
device_action_param_name: "body.value"
device_action_param_evaluator: {
  "operator": "PARAM",
  "variables": ["amount"]
}
```

**Why Single Parameter for Custom:**
- ✅ Matches most common use case (change ONE value)
- ✅ Keeps UI simple for custom templates
- ✅ If users need multiple, they should use brand templates
- ✅ Prevents configuration overload

**Recommendation to Frontend:**
- For custom templates: show single parameter config form
- For brand templates: show single parameter config (see clarification #3 about future multi-param)
- Add helper text: "If you need multiple parameters, contact support or use a premade template"

---

## 3️⃣ Multiple Flexible Parameters - Future Enhancement

### ⚠️ LIMITATION: **Currently NOT Supported - Single Parameter Only**

**Current State:**
```go
type Condition struct {
  DeviceActionBody           interface{}             // Complete template
  DeviceActionParamName      string                  // Single path
  DeviceActionParamEvaluator ConditionLogicStructure // Single evaluator
}
```

**Requested Capability (from frontend):**
```json
{
  "device_action_params": [
    {
      "device_action_param_name": "body.brightness",
      "device_action_param_evaluator": {...}
    },
    {
      "device_action_param_name": "body.color",
      "device_action_param_evaluator": {...}
    }
  ]
}
```

### 🎯 **DESIGN DECISION: Not Implementing Multi-Parameter Yet**

**Reasons:**
1. **Current Use Cases:** Vast majority of conditions need only ONE dynamic parameter
   - Brightness: single value
   - Color: single color value
   - Temperature: single value
   
2. **Complexity vs. Value:** Multi-parameter adds complexity to:
   - Data model (array instead of scalar)
   - Validation logic (multiple paths to validate)
   - Execution logic (inject multiple values)
   - UI (multiple parameter configuration)

3. **Workaround:** Users can manually add parameters to the template body:
   ```json
   // Instead of multi-param config, user sets both values in template
   {
     "brightness": 128,
     "color": "#FF0000"
   }
   // Then config only ONE to be flexible
   "device_action_param_name": "body.brightness"
   "device_action_param_evaluator": {...}
   ```

### 📋 **IF Frontend Needs Multi-Parameter Support:**

This would require:

1. **Model Change:**
   ```go
   type DeviceActionParam struct {
     ParamName: string
     ParamEvaluator: ConditionLogicStructure
   }
   
   type Condition struct {
     DeviceActionBody   interface{}
     DeviceActionParams []DeviceActionParam  // Array
   }
   ```

2. **Validation Changes:**
   - Validate each param name path exists
   - Ensure no duplicate paths
   - Ensure evaluator operators are valid

3. **Execution Changes:**
   - Loop through params array
   - Extract each value
   - Inject each at its path

4. **Database Changes:**
   - Migrate schema to store array
   - Update SQL queries

**Estimate:** ~4-6 hours for full implementation if needed

### ✅ **RECOMMENDATION:** 
- Start with single parameter (current implementation)
- If frontend encounters use case needing multiple params, document it
- Plan multi-parameter enhancement for Phase 2 if demand exists

---

## 4️⃣ Validation & Required Fields for device_action_body

### ✅ CONFIRMED: **Both {device_id} and {model_id} Required**

**Current Validation Rules in Backend:**

```go
// Backend validation when creating condition
if req.DeviceActionBody == nil {
  return "device_action_body is required"
}

bodyMap, ok := req.DeviceActionBody.(map[string]interface{})
if !ok {
  return "device_action_body must be a JSON object"
}

// Verify param path exists in template
bodyBytes, _ := json.Marshal(bodyMap)
// Check path can be navigated...
```

**Placeholders That Should Be Present:**

| Placeholder | Required | Reason |
|-------------|----------|--------|
| `{device_id}` | ✅ YES | Auto-filled for each device in group |
| `{model_id}` | ✅ YES | Auto-filled for each device's model |
| `{device_name}` | ❌ Optional | Auto-filled but not always needed |
| `{brand}` | ❌ Optional | Auto-filled but not always needed |

**Frontend Validation Should Enforce:**

```javascript
// Check template has required placeholders
const template = JSON.stringify(device_action_body);
if (!template.includes('{device_id}')) {
  error: "Template must include {device_id} placeholder"
}
if (!template.includes('{model_id}')) {
  error: "Template must include {model_id} placeholder"
}
```

**Structure Requirements:**

| Requirement | Must Have | Notes |
|-------------|-----------|-------|
| Top-level is JSON object | ✅ YES | Not array, not string |
| Contains `method` field | ✅ YES | HTTP method: POST, PUT, GET, PATCH |
| Contains `url` field | ✅ YES | Valid URL string |
| Contains `headers` field | ❌ Recommended | May be empty object {} |
| Contains `body` field | ✅ YES (usually) | Can be null if GET request |
| `body` is object | ✅ YES (usually) | Contains {device_id}, {model_id}, and other params |

**Example Valid Templates:**

```json
✅ Standard Govee:
{
  "method": "POST",
  "url": "https://api.govee.com/v1/devices/control",
  "headers": {"Govee-Token": "abc123"},
  "body": {
    "device": "{device_id}",
    "model": "{model_id}",
    "cmd": {"name": "brightness", "value": 0}
  }
}

✅ Local WLED:
{
  "method": "POST",
  "url": "http://192.168.1.100:80/json/state",
  "headers": {},
  "body": {
    "on": true,
    "bri": 255
  }
}

✅ GET Request:
{
  "method": "GET",
  "url": "https://api.example.com/device/{device_id}/status",
  "headers": {"Authorization": "Bearer token"},
  "body": null
}
```

**Invalid Examples:**

```json
❌ Just body portion (frontend should assemble full structure):
{
  "device": "{device_id}",
  "cmd": {"value": 0}
}

❌ Missing method:
{
  "url": "https://api.example.com",
  "body": {}
}

❌ Missing placeholders:
{
  "method": "POST",
  "url": "https://api.govee.com/v1/devices/control",
  "body": {
    "cmd": {"value": 0}
    // Missing {device_id} and {model_id}
  }
}
```

---

## 5️⃣ API Endpoint for Template Data - GET /device-brand-templates

### ✅ CONFIRMED: **Single GET Endpoint Returns All Template Data**

**Endpoint:**
```
GET /device-brand-templates?id={template_id}
```

**Response:**
```json
{
  "id": 8,
  "brand_name": "govee",
  "template_name": "Govee Brightness Control",
  "category": "brightness",
  "description": "Controls brightness of Govee smart lights",
  "http_method": "POST",
  "endpoint_url": "https://api.govee.com/v1/devices/control",
  "authentication_type": "api_key",
  "auth_header": "Govee-Token",
  "body_template": "{\"device\":\"{device_id}\",\"model\":\"{model_id}\",\"cmd\":{\"name\":\"brightness\",\"value\":0}}",
  "required_parameters": ["device_id", "model_id"],
  "optional_parameters": ["cmd.value"],
  "parameter_defaults": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"
    }
  },
  "requires_authentication": true,
  "supports_batch_commands": false,
  "local_network_only": false,
  "notes": "Brightness value: 0-254",
  "examples": {
    "brightness_100": {
      "request": {...},
      "response": {...}
    }
  },
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**How Frontend Uses:**

```javascript
// 1. Fetch template
const template = await GET(`/device-brand-templates?id=${templateId}`);

// 2. Build complete HTTP request
const deviceActionBody = {
  method: template.http_method,
  url: template.endpoint_url,
  headers: template.parameter_defaults?.headers || {},
  body: JSON.parse(template.body_template)
};

// 3. Let user edit body
userEditedBody = editJSON(deviceActionBody.body);
deviceActionBody.body = userEditedBody;

// 4. Send to backend
POST /conditions {
  device_action_body: deviceActionBody,
  device_action_param_name: "body.cmd.value",
  device_action_param_evaluator: {...}
}
```

**Alternative for Custom Templates:**

If user creates a custom template without selecting from catalog:
- No GET needed
- User enters complete JSON in textarea
- Same submission to backend

---

## 6️⃣ Parameter Evaluator - Operator Validation

### ✅ CONFIRMED: **All Extraction Operators Listed**

**Valid Extraction Operators (Return Values):**

| Operator | Variables | Returns | Example |
|----------|-----------|---------|---------|
| `PARAM` | 1 | Event field value | `{"operator": "PARAM", "variables": ["amount"]}` → event.amount |
| `REGEX_EXTRACT` | 1 | Matched pattern group | `{"operator": "REGEX_EXTRACT", "variables": ["brightness:(\\d+)"]}` |
| `SUBSTRING` | 1 | Substring by range | `{"operator": "SUBSTRING", "variables": ["0-3"]}` |
| `FIRST` | 1 | First N chars | `{"operator": "FIRST", "variables": ["5"]}` |
| `LAST` | 1 | Last N chars | `{"operator": "LAST", "variables": ["2"]}` |
| `COLOR_PICKUP` | 1 | Color name → RGB/HEX | `{"operator": "COLOR_PICKUP", "variables": ["message"]}` → "#FF0000" |
| `PARSEINT` | 1 | String → integer | `{"operator": "PARSEINT", "variables": ["count"]}` |
| `WHOLESENTENCE` | 1 | Entire input | `{"operator": "WHOLESENTENCE", "variables": ["message"]}` |
| `ADD` | 2 | base + value | `{"operator": "ADD", "variables": ["100", "50"]}` |
| `SUBTRACT` | 2 | base - value | `{"operator": "SUBTRACT", "variables": ["100", "50"]}` |
| `MULTIPLY` | 2 | base × value | `{"operator": "MULTIPLY", "variables": ["50", "2"]}` |
| `DIVIDE` | 2 | base ÷ value | `{"operator": "DIVIDE", "variables": ["100", "2"]}` |
| `MODULO` | 2 | base % value | `{"operator": "MODULO", "variables": ["10", "3"]}` |
| `EXCHANGE` | 2 | Currency conversion | `{"operator": "EXCHANGE", "variables": ["amount", "USD_to_JPY"]}` |

**Invalid for Parameter Extraction (Comparison/Logic Only):**

❌ DO NOT allow these for `device_action_param_evaluator`:
- `AND`, `OR`, `NOT` - boolean logic
- `GREATER_THAN`, `LESS_THAN`, `EQUIVALENT` - comparisons
- `INCLUDES`, `REGEX_MATCH`, `EQUALS` - text matching
- `COUNT`, `SUM` - aggregations

**Why Restricted:**
- These return boolean (true/false) not values
- Can't inject true/false into brightness field
- Use these for `condition_logic` (filtering) instead

### Frontend Validation

```javascript
// Allowed for parameter extraction
const EXTRACTION_OPERATORS = [
  'PARAM', 'REGEX_EXTRACT', 'SUBSTRING', 'FIRST', 'LAST',
  'COLOR_PICKUP', 'PARSEINT', 'WHOLESENTENCE',
  'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MODULO', 'EXCHANGE'
];

// Allowed for condition logic filtering (separate field)
const LOGIC_OPERATORS = [
  'AND', 'OR', 'NOT', 'SOME',
  'EQUIVALENT', 'GREATER_THAN', 'GREATER_OR_EQUAL',
  'LESS_THAN', 'LESS_OR_EQUAL',
  'EQUALS', 'INCLUDES', 'REGEX_MATCH',
  'COUNT', 'SUM'
];

// Validation
if (!EXTRACTION_OPERATORS.includes(paramEvaluator.operator)) {
  error: `Invalid extraction operator: ${paramEvaluator.operator}`;
}
```

---

## 7️⃣ Data Flow for Complete HTTP Request - Confirmed Structure

### ✅ CONFIRMED: **Backend Receives COMPLETE device_action_body**

**What Backend Expects:**

```json
POST /conditions
{
  "watch_id": "watch_123abc",
  "name": "Condition Name",
  "event_type": "superchat",
  "device_group_id": "dg_xyz789",
  
  // Complete HTTP request template (with placeholders)
  "device_action_body": {
    "method": "POST",
    "url": "https://api.govee.com/v1/devices/control",
    "headers": {
      "Govee-Token": "abc123xyz"
    },
    "body": {
      "device": "{device_id}",
      "model": "{model_id}",
      "cmd": {
        "name": "brightness",
        "value": 0
      }
    }
  },
  
  // Path to field that will be replaced with extracted value
  "device_action_param_name": "body.cmd.value",
  
  // How to extract dynamic value from event
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]
  }
}
```

**Backend Execution Flow:**

```
1. User sends $5 superchat
   └─ Event: { amount: 5, message: "Great stream!", sender_name: "viewer123" }

2. Evaluator extracts value
   └─ PARAM operator extracts event.amount → 5

3. Template cloned
   └─ deviceActionBody cloned (deep copy)

4. Parameter injected
   └─ Navigate to "body.cmd.value" using dot notation
   └─ Set to 5
   └─ Result: body.cmd.value = 5

5. Placeholders filled for each device
   └─ For device1 (id: "govee_abc123", model: "H6159"):
      {device_id} → "govee_abc123"
      {model_id} → "H6159"
      {brand} → "govee"
   └─ Result:
      {
        "device": "govee_abc123",
        "model": "H6159",
        "cmd": {"name": "brightness", "value": 5}
      }

6. HTTP request executed
   └─ POST https://api.govee.com/v1/devices/control
   └─ Headers: {"Govee-Token": "abc123xyz"}
   └─ Body: {device: "govee_abc123", model: "H6159", cmd: {...}}

7. Device responds
   └─ Brightness set to 5
```

**Data Structure NOT Sent:**

❌ Frontend should NOT send only body portion:
```json
// WRONG - Missing method/url/headers
{
  "device_action_body": {
    "device": "{device_id}",
    "cmd": {"value": 0}
  }
}
```

✅ Frontend MUST send complete structure:
```json
// CORRECT
{
  "device_action_body": {
    "method": "POST",
    "url": "https://...",
    "headers": {...},
    "body": {
      "device": "{device_id}",
      "cmd": {"value": 0}
    }
  }
}
```

---

## Summary: Design Decisions & Requirements

| # | Topic | Decision | Status | Impl. Effort |
|---|-------|----------|--------|--------------|
| 1 | Template Assembly | Frontend merges template fields into complete HTTP request | ✅ Confirmed | Already in backend |
| 2 | Custom Template Params | Single flexible parameter only | ✅ Confirmed | Already in backend |
| 3 | Multiple Flexible Params | NOT supported yet (Phase 2 enhancement) | ⚠️ Limitation | Would be 4-6 hrs if needed |
| 4 | Required Fields | {device_id}, {model_id} placeholders required | ✅ Confirmed | Frontend validation needed |
| 5 | Template Endpoint | Single GET /device-brand-templates?id=X | ✅ Confirmed | Already implemented |
| 6 | Extraction Operators | 14 operators; logic ops not allowed for param extraction | ✅ Confirmed | Frontend validation needed |
| 7 | Request Format | device_action_body is complete HTTP template | ✅ Confirmed | Already in backend |

---

## Action Items for Frontend

Based on this clarification:

- [ ] Implement template selection from `/device-brand-templates?id={id}`
- [ ] Assemble complete HTTP request structure (method, url, headers, body)
- [ ] Let user edit only the body portion
- [ ] Validate placeholders: {device_id} and {model_id} present
- [ ] Validate device_action_param_name path exists in template
- [ ] Validate extraction operator is from EXTRACTION_OPERATORS list
- [ ] Ensure single flexible parameter per condition (not array)
- [ ] Send complete device_action_body to backend (not just body)
- [ ] Handle test endpoint: POST /conditions/test-draft with full structure

---

## Action Items for Backend

NO CHANGES REQUIRED YET - Architecture is stable and working:

- Backend already supports all features in this design
- Compilation passing ✅
- No schema migrations needed
- Documentation updated ✅

**When frontend needs multi-parameter support (Phase 2):**
- [ ] Add DeviceActionParams array to Condition model
- [ ] Update validation logic
- [ ] Update execution loop
- [ ] Database migration
- [ ] Update API documentation

---

## Next Steps

1. **Frontend Team:** Review this document, confirm architecture alignment
2. **Both Teams:** Discuss any discrepancies or new requirements
3. **Frontend Team:** Implement based on confirmed architecture
4. **Both Teams:** When frontend ready, iterate on test cases
5. **Future:** Plan Phase 2 enhancements (multi-parameter, etc.)

---

**Document Status:** Ready for review  
**Backend Implementation:** Stable ✅  
**Frontend Implementation:** In progress  
**Next Review:** After frontend implementation

# Frontend Device Action Configuration - Backend Clarifications Needed

**Purpose:** Document gaps/clarifications needed from backend for completing device action parameter configuration UI.

**Focus:** Only device action template and parameter extraction (condition page scope). Not covering basic condition metadata (watch, event type, filter) as those are pre-set.

---

## 1️⃣ **Device Action Body Structure - Template Merging Process**

### Current Understanding
- **User edits in UI:** Only the `body` portion of the HTTP request template
  ```json
  {
    "device": "{device_id}",
    "cmd": {"name": "brightness", "value": 0}
  }
  ```

- **Backend receives:** Complete HTTP request template
  ```json
  {
    "method": "POST",
    "url": "https://api.govee.com/v1/control",
    "headers": {...},
    "body": {
      "device": "{device_id}",
      "cmd": {"name": "brightness", "value": 0}
    }
  }
  ```

### Question
**Where does the `method`, `url`, and `headers` come from?**

**Option A:** From device_brand_templates table
- Frontend fetches template by ID → GET `/device-templates/get?id={templateId}`
- Response includes: `method`, `url`, `headers`, `body_template`
- Frontend only lets user edit `body_template`
- On submit: merge user's edited body with the static method/url/headers

**Option B:** User provides full HTTP template
- Frontend JSON editor shows/requires full structure
- User can edit method, url, headers, body

**Option C:** Some fields from template, others from custom input
- E.g., method/url from template, headers+body configurable

**Clarification Needed:** What endpoint(s) provide the full template data? Should GET `/device-templates/get?id={templateId}` return:
```json
{
  "id": "template_123",
  "device_brand_id": "...",
  "name": "Govee Brightness Control",
  "method": "POST",
  "url": "https://api.govee.com/v1/control",
  "headers": {"Govee-Token": "..."},  // With placeholder token?
  "body_template": "{...}"
}
```

---

## 2️⃣ **Custom Template Parameter Handling**

### Current Status
- UI allows entering custom JSON template manually
- Custom template **currently supports:** 
  - Only ONE flexible parameter (path: `__custom_template__`)
  - No static parameters configured separately

### Question
**For custom templates, should parameter configuration work identically to premade templates?**

**Option A:** Same as premade templates
- User enters full HTTP JSON in textarea
- User can configure multiple static/flexible parameters pointing to different paths
- No special handling needed

**Option B:** Simplified - only one flexible parameter allowed
- Custom template is just the JSON body
- Only supports ONE flexible extraction (current implementation)
- Use case: for ad-hoc templates without complex multi-parameter setup

**Option C:** No parameter config for custom templates
- Custom template is final JSON sent to device
- All parameter values must be manually entered in JSON
- Flexible extraction not supported for custom

### Current Implementation Assumption
We're using **Option B** - custom templates support only one flexible parameter extraction. Is this correct?

---

## 3️⃣ **Multiple Flexible Parameters**

### Question
**Can a condition have multiple flexible parameters?**

Example use case:
```json
Template:
{
  "method": "POST",
  "url": "api.example.com/control",
  "body": {
    "brightness": 100,
    "color": "#FF0000"
  }
}

Parameter Config 1:
  device_action_param_name: "body.brightness"
  device_action_param_evaluator: {"operator": "PARAM", "variables": ["amount"]}

Parameter Config 2:
  device_action_param_name: "body.color"
  device_action_param_evaluator: {"operator": "COLOR_PICKUP", "variables": ["message"]}
```

**Backend Requirement:** Does the condition object support an **array** of parameter configurations?

```json
{
  "device_group_id": "group_123",
  "device_action_body": {...},
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

Or is it still limited to **single** flexible parameter (current implementation)?

---

## 4️⃣ **Validation & Required Fields for device_action_body**

### Question
**Which fields are required in the device_action_body JSON template?**

From FRONTEND_CONDITION_IMPLEMENTATION_CHECKLIST.md:
- "Must include both `{device_id}` and `{model_id}` placeholders"

**Clarification Needed:**
- Must BOTH be present in every template, or just recommended best practice?
- Should frontend validate their presence?
- Are there other required placeholders like `{brand}`, `{product_id}`?
- Should the JSON structure include method/url, or just the body object?

---

## 5️⃣ **API Endpoint for Template Data**

### Current Implementation
```javascript
GET /device-templates/get?id={templateId}
// Expected response:
{
  "id": "...",
  "name": "...",
  "body_template": "{...}"  // JSON string
}
```

### Question
**For merging the full HTTP request, what endpoint provides:**
- Template method
- Template URL
- Template headers
- Template body

**Options:**
- A) Single GET endpoint returns all: `GET /device-templates/get?id={templateId}`
- B) Separate endpoint for method/url/headers: `GET /device-templates/{id}/http-config`
- C) Data returned when fetching device group: `GET /device-groups/get?id={groupId}` includes template data

---

## 6️⃣ **Parameter Evaluator - Operator Validation**

### Current Understanding
From CONDITION_API_QUICK_REFERENCE.md, valid extraction operators are:
- `PARAM` - direct field
- `REGEX_EXTRACT` - pattern match
- `COLOR_PICKUP` - color conversion
- `MULTIPLY` - math
- `ADD` - math
- `PARSEINT` - type conversion
- `MULTIPLY`, `ADD`, `DIVIDE`, `SUBTRACT` - arithmetic

### Question
**Are there any other extraction operators we should support that return a value?**

Also confirm: Comparison operators (AND, OR, GREATER_THAN, INCLUDES, etc.) should **NOT** be allowed for parameter extraction evaluators, correct? (Frontend will validate this)

---

## 7️⃣ **Data Flow for Complete HTTP Request**

### Current Process
Frontend collects:
1. User-edited `body` object
2. `device_action_param_name` (path to replace)
3. `device_action_param_evaluator` (operator + variables)

On submit, frontend sends to backend:
```json
POST /conditions
{
  "device_group_id": "group_123",
  "device_action_body": {
    "method": "...",
    "url": "...",
    "headers": {...},
    "body": {...}  // From template, with user edits applied
  },
  "device_action_param_name": "body.brightness",
  "device_action_param_evaluator": {...}
}
```

### Question
**Confirmation:** Does backend expect `device_action_body` to be complete with method/url/headers, or only the body part?

---

## Summary of Required Clarifications

| # | Topic | Question | Impact |
|---|-------|----------|--------|
| 1 | Template Structure | Where do method/url/headers come from? | Determines if frontend needs to merge or user provides all |
| 2 | Custom Template Params | Multiple params or just one flexible? | UI complexity (single textarea vs param config form) |
| 3 | Multiple Flexible Params | Array support or single param only? | Backend data structure change |
| 4 | Required Fields | Must templates have {device_id}/{model_id}? | Validation rules |
| 5 | Template Endpoint | What data does GET /device-templates/get return? | Frontend merging logic |
| 6 | Operators | Any new extraction operators to support? | Parameter form dropdown options |
| 7 | Request Format | device_action_body structure? | Data structure sent to backend |

---

## Implementation Status

**Waiting for Backend Clarification Before:**
- [ ] Determining template data merge strategy
- [ ] Implementing multiple flexible parameters (if supported)
- [ ] Finalizing device_action_body structure sent to backend
- [ ] Setting up parameter evaluator operator validation rules

**Already Implemented (Assuming Option A/B from above):**
- ✅ Template selector dropdown
- ✅ Single flexible parameter extraction
- ✅ Parameter form rendering
- ✅ Custom template JSON input
- ✅ ConditionEditor integration for flexible parameters

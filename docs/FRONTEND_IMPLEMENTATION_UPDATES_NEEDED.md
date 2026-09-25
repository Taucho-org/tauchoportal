# Frontend Implementation Updates - Based on Backend Clarification Reply

**Date:** September 23, 2025  
**Status:** Ready for implementation  
**Scope:** What frontend (condition.js/condition.html) needs to change/add based on backend reply

---

## ✅ Already Correct (No Changes Needed)

### 1. Single Flexible Parameter Per Condition
- ✅ Current implementation: Only supports one `device_action_param_name` + `device_action_param_evaluator`
- ✅ Backend confirms: This is the design (not Phase 2 yet)
- **Action:** Keep as-is, no changes needed

### 2. Custom Template Support
- ✅ Current implementation: Allows user to enter custom JSON
- ✅ Backend confirms: Custom templates get same treatment as brand templates (single flexible param)
- **Action:** Keep as-is, no changes needed

### 3. ConditionEditor for Flexible Parameters
- ✅ Current implementation: Uses ConditionEditor for flexible param extraction
- ✅ Backend confirms: This is correct (though may be complex for users)
- **Action:** Keep as-is, but see operator validation below

### 4. Template Merging on Frontend
- ✅ Current assumption: Frontend should merge template fields
- ✅ Backend confirms: **Option A confirmed** - frontend assembles complete HTTP structure
- **Action:** Keep as-is, implementation approach is correct

---

## 🟡 Needs Updates

### 1. ⚠️ **Template Endpoint Response Handling**

**What Backend Returns (Updated Endpoint Response):**

```json
{
  "id": 8,
  "brand_name": "govee",
  "template_name": "Govee Brightness Control",
  "category": "brightness",
  "description": "...",
  "http_method": "POST",           // ← Use this for method
  "endpoint_url": "https://...",   // ← Use this for url
  "authentication_type": "api_key",
  "auth_header": "Govee-Token",
  "body_template": "{...}",        // ← Parse this for body
  "required_parameters": [...],
  "optional_parameters": [...],
  "parameter_defaults": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"
    }
  },
  "requires_authentication": true,
  "supports_batch_commands": false,
  "local_network_only": false,
  "notes": "...",
  "examples": {...}
}
```

**Current Implementation Issue:**
- Only using `body_template` from response
- Missing: `http_method`, `endpoint_url`, `parameter_defaults.headers`

**Update Needed in condition.js:**

In `onTemplateSelected()` and template display methods, update to:

```javascript
// After fetchTemplateById(templateId)
const template = await this.fetchTemplateById(templateId);

// Assemble complete HTTP request
const deviceActionBody = {
  method: template.http_method || 'POST',
  url: template.endpoint_url,
  headers: template.parameter_defaults?.headers || {},
  body: typeof template.body_template === 'string' 
    ? JSON.parse(template.body_template)
    : template.body_template
};

// Store for later use
this.selectedTemplate = { ...template, assembledBody: deviceActionBody };
```

**Then in updateJsonFromForm():**

```javascript
// Instead of using selectedTemplate.body_template
const completeDeviceActionBody = this.selectedTemplate.assembledBody;
params.device_action_body = JSON.parse(JSON.stringify(completeDeviceActionBody));

// Apply user edits to body portion only
const userEditedBody = { ...completeDeviceActionBody.body };
// ... apply parameter configs to userEditedBody ...
params.device_action_body.body = userEditedBody;
```

---

### 2. ✅ **Operator Validation - Frontend Should Filter**

**Backend Confirms:** 14 extraction operators only (not comparison/logic operators)

**Valid Extraction Operators:**
- PARAM
- REGEX_EXTRACT
- SUBSTRING
- FIRST
- LAST
- COLOR_PICKUP
- PARSEINT
- WHOLESENTENCE
- ADD
- SUBTRACT
- MULTIPLY
- DIVIDE
- MODULO
- EXCHANGE

**Invalid for Parameter Extraction:**
- AND, OR, NOT
- GREATER_THAN, LESS_THAN, EQUIVALENT
- INCLUDES, REGEX_MATCH, EQUALS
- COUNT, SUM

**Current Implementation Issue:**
- Uses full ConditionEditor which includes ALL operators
- No validation that operator returns a value (not boolean)

**Update Needed:**

Add validator function:

```javascript
const EXTRACTION_OPERATORS = new Set([
  'PARAM', 'REGEX_EXTRACT', 'SUBSTRING', 'FIRST', 'LAST',
  'COLOR_PICKUP', 'PARSEINT', 'WHOLESENTENCE',
  'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MODULO', 'EXCHANGE'
]);

validateParameterEvaluator(evaluatorJSON) {
  if (!evaluatorJSON.operator) {
    return { valid: false, error: 'Operator is required' };
  }
  
  if (!EXTRACTION_OPERATORS.has(evaluatorJSON.operator)) {
    return { 
      valid: false, 
      error: `Operator '${evaluatorJSON.operator}' is not valid for parameter extraction. Must be one of: ${Array.from(EXTRACTION_OPERATORS).join(', ')}`
    };
  }
  
  // Validate variables count based on operator
  const operatorVariableCount = {
    'PARAM': 1, 'REGEX_EXTRACT': 1, 'SUBSTRING': 1, 'FIRST': 1, 'LAST': 1,
    'COLOR_PICKUP': 1, 'PARSEINT': 1, 'WHOLESENTENCE': 1,
    'ADD': 2, 'SUBTRACT': 2, 'MULTIPLY': 2, 'DIVIDE': 2, 'MODULO': 2, 'EXCHANGE': 2
  };
  
  const requiredCount = operatorVariableCount[evaluatorJSON.operator];
  const actualCount = evaluatorJSON.variables?.length || 0;
  
  if (actualCount !== requiredCount) {
    return {
      valid: false,
      error: `Operator '${evaluatorJSON.operator}' requires ${requiredCount} variable(s), got ${actualCount}`
    };
  }
  
  return { valid: true };
}
```

Then in `updateJsonFromForm()`, validate before sending to backend:

```javascript
if (config.mode === 'flexible' && config.evaluator) {
  const validation = this.validateParameterEvaluator(config.evaluator);
  if (!validation.valid) {
    console.error('Invalid flexible parameter:', validation.error);
    return; // Don't update JSON
  }
}
```

---

### 3. ✅ **Placeholder Validation - Frontend Should Enforce**

**Backend Confirms:** Both `{device_id}` and `{model_id}` required in template

**Current Implementation Issue:**
- No validation that placeholders exist

**Update Needed:**

Add validator function:

```javascript
validateTemplateHasRequiredPlaceholders(deviceActionBody) {
  const bodyString = JSON.stringify(deviceActionBody);
  
  if (!bodyString.includes('{device_id}')) {
    return { valid: false, error: 'Template must include {device_id} placeholder' };
  }
  
  if (!bodyString.includes('{model_id}')) {
    return { valid: false, error: 'Template must include {model_id} placeholder' };
  }
  
  return { valid: true };
}
```

Then in `updateJsonFromForm()`, validate before sending:

```javascript
const validation = this.validateTemplateHasRequiredPlaceholders(params.device_action_body);
if (!validation.valid) {
  console.error('Template validation failed:', validation.error);
  return; // Don't update JSON
}
```

---

### 4. ✅ **device_action_body Structure - Complete HTTP Template**

**Backend Confirms:** Frontend sends COMPLETE structure (method, url, headers, body)

**Current Implementation Issue:**
- Currently only storing the `body` portion in device_action_body
- Missing: method, url, headers

**Example Current (INCORRECT):**
```json
{
  "device_action_body": {
    "device": "{device_id}",
    "cmd": {"value": 0}
  }
}
```

**Example Correct (WHAT BACKEND EXPECTS):**
```json
{
  "device_action_body": {
    "method": "POST",
    "url": "https://api.govee.com/v1/devices/control",
    "headers": {"Govee-Token": "abc123"},
    "body": {
      "device": "{device_id}",
      "cmd": {"value": 0}
    }
  }
}
```

**Update Needed:**

In `updateJsonFromForm()`, when building params object:

```javascript
if (this.selectedTemplateId === '__custom__') {
  // Custom template: user enters complete JSON
  const customTemplateInput = this.modalElement?.querySelector('#modal_customTemplateJSON');
  if (customTemplateInput) {
    try {
      params.device_action_body = JSON.parse(customTemplateInput.value);
      // Validate it's complete (has method, url, headers, body)
      if (!params.device_action_body.method) {
        console.error('Custom template missing: method field');
        return;
      }
      if (!params.device_action_body.url) {
        console.error('Custom template missing: url field');
        return;
      }
    } catch (e) {
      console.error('Invalid custom template JSON:', e);
      return;
    }
  }
} else {
  // Brand template: assemble from template + user edits
  const template = this.selectedTemplate;
  
  params.device_action_body = {
    method: template.http_method || 'POST',
    url: template.endpoint_url,
    headers: template.parameter_defaults?.headers || {},
    body: JSON.parse(JSON.stringify(
      typeof template.body_template === 'string' 
        ? JSON.parse(template.body_template)
        : template.body_template
    ))
  };
  
  // Apply static parameter configs to body
  for (const [path, config] of Object.entries(this.parameterConfigs)) {
    if (config.mode === 'static') {
      const value = config.mode === 'json' 
        ? (typeof config.value === 'string' ? JSON.parse(config.value) : config.value)
        : config.value;
      this.setNestedProperty(params.device_action_body.body, path, value);
    }
  }
  
  // Flexible parameter: store only first one
  for (const [path, config] of Object.entries(this.parameterConfigs)) {
    if (config.mode === 'flexible' && !params.device_action_param_name) {
      params.device_action_param_name = path;
      params.device_action_param_evaluator = config.evaluator;
      break; // Only first flexible parameter
    }
  }
}
```

---

### 5. ⚠️ **Dot Notation Path Validation**

**Backend Confirms:** Path must exist in body template (not in method/url/headers)

**Current Implementation Issue:**
- Extracts paths from entire device_action_body
- Should extract paths only from body portion

**Update Needed:**

In `extractParameterPaths()`, modify to work only on body:

```javascript
extractParameterPaths(fromBody = true) {
  let obj;
  
  if (fromBody && this.selectedTemplate?.body_template) {
    // Extract paths only from body portion
    obj = typeof this.selectedTemplate.body_template === 'string'
      ? JSON.parse(this.selectedTemplate.body_template)
      : this.selectedTemplate.body_template;
  } else if (this.selectedTemplate?.assembledBody?.body) {
    obj = this.selectedTemplate.assembledBody.body;
  } else {
    return [];
  }

  const paths = [];
  const traverse = (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value, path);
        } else {
          paths.push(path);
        }
      }
    }
  };
  
  traverse(obj);
  return paths;
}
```

Then validate in `updateJsonFromForm()`:

```javascript
// Validate parameter path exists in body
const validPaths = this.extractParameterPaths();
if (params.device_action_param_name && !validPaths.includes(params.device_action_param_name)) {
  console.error(`Parameter path '${params.device_action_param_name}' not found in template body`);
  return;
}
```

---

## 🔴 Critical Issues to Fix

### Issue #1: Complete HTTP Template Not Being Sent
**Severity:** CRITICAL  
**Impact:** Backend receives incomplete template, cannot execute  
**Fix:** Update `updateJsonFromForm()` to include method, url, headers

### Issue #2: No Operator Validation
**Severity:** HIGH  
**Impact:** Users can select comparison operators that return booleans (not injectable values)  
**Fix:** Add `validateParameterEvaluator()` and validate before save

### Issue #3: No Placeholder Validation
**Severity:** HIGH  
**Impact:** Condition fails at execution time if {device_id}/{model_id} missing  
**Fix:** Add `validateTemplateHasRequiredPlaceholders()` and validate before save

---

## Summary of Files to Modify

### `/public/js/condition.js`

1. **Update template fetching:**
   - In `onTemplateSelected()`: Build complete HTTP object from response fields
   - Store `http_method`, `endpoint_url`, `parameter_defaults.headers`

2. **Add validators:**
   - `validateParameterEvaluator()` - Check operator is in extraction list + validate variable counts
   - `validateTemplateHasRequiredPlaceholders()` - Ensure {device_id} and {model_id} present

3. **Update updateJsonFromForm():**
   - Build `device_action_body` with method, url, headers, body
   - For brand templates: assemble from fetched template
   - For custom templates: validate has all required fields
   - Call validators before updating textarea
   - Handle errors gracefully

4. **Update extractParameterPaths():**
   - Only extract from body portion (not method/url/headers)
   - Ensure paths are validated against body structure

### `/templates/pages/condition.html`

- No changes needed (if modal/JSON editor already in place)

### No Backend Changes
- ✅ Backend already correct per reply
- ✅ All endpoints return expected data
- ✅ Execution logic is correct

---

## Validation Rules to Implement

Before saving condition, frontend must validate:

| Check | Validation | Error Message |
|-------|-----------|---------------|
| Device group selected | `device_group_id` not empty | "Select a device group" |
| Template loaded | Template ID not null | "Select or create a template" |
| Template is valid JSON | `device_action_body` parses | "Template JSON is invalid" |
| Template has {device_id} | String contains "{device_id}" | "Template missing {device_id}" |
| Template has {model_id} | String contains "{model_id}" | "Template missing {model_id}" |
| HTTP method exists | `device_action_body.method` present | "Template missing HTTP method" |
| URL exists | `device_action_body.url` present | "Template missing URL" |
| Param path exists | Path navigable in `device_action_body.body` | "Parameter path not found in template" |
| Operator valid | Operator in extraction list | "Invalid operator for parameter extraction" |
| Variables count | Matches operator requirement | "Wrong number of variables for operator" |

---

## Testing Checklist

After implementing updates:

- [ ] Load brand template: verify method/url/headers populated from response
- [ ] Edit template body: verify only body portion editable
- [ ] Configure flexible parameter with PARAM operator: works
- [ ] Configure flexible parameter with REGEX_EXTRACT: works
- [ ] Configure flexible parameter with ADD/MULTIPLY: works
- [ ] Try invalid operator (GREATER_THAN): validation error shown
- [ ] Remove {device_id}: validation error shown
- [ ] Parameter path points to non-existent field: validation error shown
- [ ] Submit valid condition: JSON sent to backend has complete HTTP structure
- [ ] Custom template: allows full HTTP JSON, validates same way

---

## Implementation Priority

### Must Do (Blocking)
1. ✅ Fix device_action_body to include method, url, headers
2. ✅ Add operator validation
3. ✅ Add placeholder validation

### Should Do (High Value)
4. ✅ Update template response handling for new fields
5. ✅ Fix dot notation path extraction to work on body only

### Nice to Have (Polish)
6. Add error messages to UI
7. Add helper text for operator selection
8. Show template summary to user

---

**Status:** Ready for implementation  
**Blocking:** Items 1-3 must be done before submitting conditions  
**Timeline:** ~2-3 hours to implement all changes  
**Next:** Frontend developer picks up and implements updates

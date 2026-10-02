# Frontend Implementation Complete - Backend Clarifications & Potential Issues

**Date:** September 23, 2025  
**Status:** Implementation complete  
**Build Status:** ✅ Passing

---

## Summary of Frontend Changes

All critical updates have been implemented in `/public/js/condition.js`:

✅ Template response handling - merges `http_method`, `endpoint_url`, `parameter_defaults.headers` into complete HTTP object  
✅ Operator validation - restricts to 14 extraction operators only, validates variable counts  
✅ Placeholder validation - ensures `{device_id}` and `{model_id}` present in template  
✅ Complete device_action_body - sends full HTTP structure (method, url, headers, body) to backend  
✅ Path validation - only extracts paths from body portion, validates paths exist  

---

## ⚠️ Potential Backend Misunderstandings

### Issue #1: Evaluator Structure Format

**Current Frontend Assumption:**
Frontend assumes evaluator JSON structure uses **CAPITAL** keys:
```json
{
  "Operator": "PARAM",
  "Variables": ["amount"],
  "SubConditions": [...]
}
```

**Backend Documentation Says:**
Quick reference shows lowercase:
```json
{
  "operator": "PARAM",
  "variables": ["amount"]
}
```

**Question for Backend:**
- Does the backend actually expect `Operator` (capital) or `operator` (lowercase)?
- Does the backend expect `Variables` (capital) or `variables` (lowercase)?
- Does the backend expect `SubConditions` (capital) or `subConditions`/`subconditions`?

**Evidence:**
- Existing ConditionEditor code uses capital: `{ "Operator": "WHOLESENTENCE", "SubConditions": [], "Variables": [] }`
- Backend reply example (line 92) shows lowercase: `{"operator": "PARAM", "variables": ["amount"]}`

**Action Needed:**
Backend should clarify the EXACT JSON field names used in the API. Frontend is currently using CAPITAL format consistent with existing ConditionEditor, but if backend expects lowercase, this will cause failures.

---

### Issue #2: Custom Template Parameter Path

**Current Frontend Behavior:**
When user creates a custom template and configures flexible parameter, frontend stores:
- `device_action_param_name`: `"__custom_template__"` (special sentinel value)
- `device_action_param_evaluator`: The evaluator JSON

**Backend Implementation Question:**
- How should backend interpret `device_action_param_name: "__custom_template__"`?
- Does backend have special handling for this sentinel value?
- Or should frontend send the actual path within the custom template body?

**Example:**
Custom template:
```json
{
  "method": "POST",
  "url": "https://api.example.com",
  "body": {
    "device_id": "{device_id}",
    "value": 100
  }
}
```

Flexible parameter configured for the entire custom template.

**What Frontend Currently Sends:**
```json
{
  "device_action_body": {...},
  "device_action_param_name": "__custom_template__",
  "device_action_param_evaluator": {...}
}
```

**Alternative Interpretation:**
```json
{
  "device_action_body": {...},
  "device_action_param_name": "body.value",  // Actual path
  "device_action_param_evaluator": {...}
}
```

**Action Needed:**
Backend should clarify: Is `"__custom_template__"` sentinel value handled specially, or should frontend send actual path?

---

### Issue #3: Static Parameter Values in device_action_body

**Current Frontend Behavior:**
Frontend pre-fills static parameter values into `device_action_body.body` before sending to backend.

**Example:**
Template:
```json
{
  "brightness": 0,
  "color": "#FF0000"
}
```

User sets:
- brightness: Static Value "100"
- color: Flexible extraction

Frontend sends:
```json
{
  "device_action_body": {
    "method": "POST",
    "url": "https://...",
    "body": {
      "brightness": "100",     // ← Pre-filled static value
      "color": "#FF0000"       // ← Original template value (will be replaced)
    }
  },
  "device_action_param_name": "body.color",
  "device_action_param_evaluator": {...}
}
```

**Question:**
- Is this the correct behavior?
- Should backend expect static values already injected in `device_action_body`?
- Or should frontend send ONLY template values and backend receive static configs separately?

**Issue:** If backend expects template to NOT have static values pre-filled, this approach will fail.

**Action Needed:**
Backend should confirm: Are static parameter values pre-filled in device_action_body, or should they be sent separately?

---

### Issue #4: Headers Field Requirements

**Current Frontend Assumption:**
Template's `parameter_defaults.headers` is copied to `device_action_body.headers`.

If headers are missing, frontend defaults to empty object `{}`.

**Example Response from GET /device-brand-templates?id={id}:**
```json
{
  "parameter_defaults": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"
    }
  }
}
```

**Question:**
- Should frontend replace `{{CREDENTIAL_API_KEY}}` placeholder with actual API key?
- Or is this placeholder left for backend to fill?
- If frontend should fill it, where does it get the actual credential value?

**Current Implementation:**
Frontend sends the placeholder AS-IS from template response. No credential substitution happens.

```json
{
  "device_action_body": {
    "method": "POST",
    "url": "https://api.govee.com/v1/control",
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"  // ← Literal placeholder
    }
  }
}
```

**Action Needed:**
Backend should clarify:
1. Are credential placeholders like `{{CREDENTIAL_API_KEY}}` meant to be filled by frontend or backend?
2. If frontend should fill them, what API endpoint provides the actual credential values?
3. If backend fills them, how does it know which credential to use?

---

### Issue #5: Execution Time Parameter Injection

**Current Backend Understanding (from docs):**
Execution flow:
1. Event occurs
2. Extract value using `device_action_param_evaluator`
3. Inject extracted value at `device_action_param_name` path
4. Fill device placeholders ({device_id}, {model_id})
5. Execute HTTP request

**Frontend Question:**
- Does backend inject the extracted value BEFORE or AFTER filling device placeholders?
- If the flexible parameter is `device_id` itself (e.g., extracting device ID from event), what's the order of operations?

**Example:**
What if user configures:
```json
{
  "device_action_param_name": "body.device",
  "device_action_param_evaluator": {"operator": "PARAM", "variables": ["device_id_from_event"]}
}
```

Does backend:
- A) Replace {device_id} placeholder first, then inject extracted value?
- B) Inject extracted value into path, ignoring {device_id} placeholders in that same field?

**Action Needed:**
Backend should document the exact order of operations for:
1. Placeholder replacement ({device_id}, {model_id}, {brand})
2. Flexible parameter injection
3. Conflict resolution (if they overlap)

---

### Issue #6: Operator Variable Count Validation

**Current Frontend Implementation:**
Validators expect specific variable counts per operator:
- 1-arg: PARAM, REGEX_EXTRACT, SUBSTRING, FIRST, LAST, COLOR_PICKUP, PARSEINT, WHOLESENTENCE
- 2-arg: ADD, SUBTRACT, MULTIPLY, DIVIDE, MODULO, EXCHANGE

**Question:**
Does backend enforce these exact counts, or are they more flexible?

For example:
- Can MULTIPLY have 3 variables: `["base", "multiplier1", "multiplier2"]`?
- Can REGEX_EXTRACT have 2 variables (pattern + flags)?
- Can ADD work with 1 variable (auto-add)?

**Current Implementation Behavior:**
If user enters wrong variable count, frontend shows error and doesn't send to backend.

**Action Needed:**
Backend should confirm:
1. Does backend also validate variable counts?
2. Are the counts in frontend correct per backend implementation?
3. Are there any operators with flexible/variable argument counts?

---

## 🧪 Testing Recommendations

Before going live, backend team should:

### Test Case 1: Brand Template with Static Parameter
1. Select brand template "Govee Brightness"
2. Configure brightness: Static Value "100"
3. Configure color: Flexible extraction (PARAM from event color field)
4. Submit and verify:
   - device_action_body has method/url/headers/body
   - brightness is pre-set to "100" in body
   - device_action_param_name points to color field
   - device_action_param_evaluator operator is valid

### Test Case 2: Custom Template
1. Enter custom JSON template manually
2. Configure flexible parameter with operator "ADD"
3. Submit and verify:
   - device_action_body is complete HTTP structure
   - device_action_param_name is "__custom_template__" OR actual path
   - Evaluator has correct variable count for ADD (should be 2)

### Test Case 3: Operator Validation
1. Try to create condition with operator "GREATER_THAN" for flexible param
2. Frontend should reject with error message
3. Verify backend ALSO rejects if frontend check bypassed

### Test Case 4: Placeholder Validation
1. Create template WITHOUT {device_id}
2. Frontend should reject with error
3. Frontend should force user to add {device_id}

### Test Case 5: Execution with Static + Flexible
1. Template: `{"brightness": 50, "color": "#FF0000"}`
2. Config: brightness static "100", color flexible PARAM
3. Event: `{color: "blue"}`
4. Expected result: Request has brightness=100, color="blue" (extracted)

---

## 📝 Summary of Frontend Implementation

### What Was Implemented

1. **Template Merging** ✅
   - Assembles complete HTTP structure from endpoint response
   - Handles method, url, headers, body fields
   - Custom templates treated same as brand templates

2. **Operator Validation** ✅
   - Only 14 extraction operators allowed
   - Validates variable count per operator
   - Rejects comparison/logic operators

3. **Placeholder Validation** ✅
   - Ensures {device_id} present
   - Ensures {model_id} present
   - Shows error messages if missing

4. **Path Validation** ✅
   - Only extracts paths from body (not method/url/headers)
   - Validates path exists in body structure
   - Shows error if path not found

5. **Complete HTTP Submission** ✅
   - Sends full device_action_body with method/url/headers/body
   - Applies static parameter values to body
   - Identifies flexible parameter for extraction

### What Still Needs Backend Clarification

1. Evaluator key naming (Operator vs operator, Variables vs variables)
2. Custom template parameter path handling (__custom_template__ vs actual path)
3. Static parameter pre-fill vs separate submission
4. Credential placeholder resolution
5. Parameter injection timing relative to placeholder replacement
6. Operator variable count flexibility

---

## 🎯 Next Steps

### Frontend (Complete ✅)
- [x] Implement template assembly
- [x] Add operator validation
- [x] Add placeholder validation
- [x] Add path validation
- [x] Build complete HTTP structure
- [x] Test build passes
- [x] Create documentation of assumptions

### Backend (Waiting for Input)
- [ ] Clarify evaluator field naming (capital vs lowercase)
- [ ] Confirm custom template parameter path handling
- [ ] Clarify static parameter injection timing
- [ ] Document credential placeholder handling
- [ ] Confirm operator variable count requirements
- [ ] Run test cases (TC1-TC5)
- [ ] Verify all backend validations match frontend

### Both Teams
- [ ] Integration testing with real data
- [ ] End-to-end condition execution
- [ ] Error scenario testing

---

**Document Status:** Ready for backend review  
**Build Status:** ✅ Passing  
**Code Freeze:** Ready for testing

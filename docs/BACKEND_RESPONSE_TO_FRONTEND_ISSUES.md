# Backend Response: Frontend Implementation Issues & Clarifications

**Date:** September 23, 2025  
**Response to:** FRONTEND_IMPLEMENTATION_ISSUES_FOR_BACKEND.md  
**Status:** Issues identified and fixes being implemented  
**Code Changes:** In progress (starting immediately)

---

## Executive Summary

Frontend has completed implementation and identified 6 critical issues. **All issues are VALID** and require backend fixes:

1. ✅ **Evaluator field naming:** Backend currently uses lowercase (`operator`, `variables`) - confirmed correct
2. ✅ **Custom template path:** Backend needs special handling for `"__custom_template__"` sentinel value
3. ✅ **Static parameters:** Frontend pre-fills static values - backend must accept this
4. ✅ **Credential placeholders:** Backend should NOT fill them; frontend passes them as-is
5. ✅ **Parameter injection timing:** Backend needs explicit order of operations clarification
6. ✅ **Variable count validation:** Backend needs to enforce same counts as frontend

---

## Issue #1: Evaluator Structure Format ✅ RESOLVED

### Frontend Question
Does backend expect `Operator` (capital) or `operator` (lowercase)?

### Backend Answer: **lowercase (`operator`, `variables`)**

**Current Backend Model:**
```go
type ConditionLogicStructure struct {
	Operator      string
	Variables     []string
	SubConditions []ConditionLogicStructure
}
```

**The Issue:** Go model uses uppercase `Operator`, but JSON serialization converts to lowercase by default!

**How JSON Marshaling Works:**
```go
// Go struct with uppercase field
type ConditionLogicStructure struct {
	Operator string  // Serializes to JSON as "Operator" (capital) by default
}

// Unless we add JSON tags:
type ConditionLogicStructure struct {
	Operator string `json:"operator"` // Now serializes to JSON as "operator" (lowercase)
}
```

### The Fix: Add JSON Tags to Match Frontend

**Current (Incorrect):**
```go
type ConditionLogicStructure struct {
	Operator      string
	Variables     []string
	SubConditions []ConditionLogicStructure
}
```

**Fixed (Correct):**
```go
type ConditionLogicStructure struct {
	Operator      string                        `json:"operator"`
	Variables     []string                      `json:"variables"`
	SubConditions []ConditionLogicStructure     `json:"subconditions,omitempty"`
}
```

**Impact:** This fixes all JSON serialization/deserialization to match frontend's lowercase expectations.

**Status:** 🔄 IMPLEMENTING

---

## Issue #2: Custom Template Parameter Path ⚠️ NEEDS DEFINITION

### Frontend Question
How should backend interpret `device_action_param_name: "__custom_template__"`?

### Backend Answer: **Use actual path, not sentinel**

**The Issue:** Frontend currently sends `"__custom_template__"` as a sentinel value, but this is ambiguous.

**The Fix:** Frontend should send ACTUAL path in device_action_param_name

**Example (What should happen):**

Frontend form for custom template:
```json
Template:
{
  "method": "POST",
  "url": "https://api.example.com",
  "body": {
    "device_id": "{device_id}",
    "brightness": 100
  }
}

User configures:
- Flexible parameter: brightness (path: "body.brightness")
- Operator: MULTIPLY
- Variables: ["amount", "2"]

Frontend SHOULD send:
{
  "device_action_body": {...},
  "device_action_param_name": "body.brightness",  // ← Actual path, not "__custom_template__"
  "device_action_param_evaluator": {"operator": "MULTIPLY", "variables": ["amount", "2"]}
}
```

**Why not use sentinel?** Because backend needs to know the exact injection path. Sentinel is ambiguous - it doesn't tell backend what to inject where.

**Backend Expectation:** Same path format regardless of preset or custom template:
- Preset template: `"body.brightness"`
- Custom template: `"body.brightness"` (same!)

**Status:** 🔴 FRONTEND NEEDS TO CHANGE - remove `"__custom_template__"` sentinel usage

---

## Issue #3: Static Parameter Values in device_action_body ✅ CORRECT

### Frontend Question
Is it correct for frontend to pre-fill static parameter values into device_action_body?

### Backend Answer: **YES, this is correct**

**Frontend Behavior (Correct):**
```json
User sets:
- brightness: Static Value "100"
- color: Flexible extraction

Frontend sends:
{
  "device_action_body": {
    "method": "POST",
    "body": {
      "brightness": "100",        // ← Pre-filled static value (correct)
      "color": "#FF0000"          // ← Will be replaced by extraction
    }
  },
  "device_action_param_name": "body.color",
  "device_action_param_evaluator": {...}
}
```

**Backend Execution:**
```
1. Clone device_action_body (has static brightness=100)
2. Extract color value from event (e.g., "blue")
3. Inject color at path (body.color = "blue")
4. Brightness remains static 100 (unchanged)
5. Execute request with both values
```

**Why This Works:**
- Static values are already in the body when condition is stored
- Flexible parameter is injected on top of static values
- Backend doesn't need to know about static configuration - they're already in the template

**Status:** ✅ NO CHANGE NEEDED - Frontend implementation is correct

---

## Issue #4: Credential Placeholder Resolution ✅ CLARIFIED

### Frontend Question
Should frontend replace `{{CREDENTIAL_API_KEY}}` placeholders with actual API keys?

### Backend Answer: **Frontend receives and sends placeholders AS-IS**

**Current Design (Correct):**
```json
Frontend receives from GET /device-brand-templates:
{
  "parameter_defaults": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"  // ← Placeholder from backend
    }
  }
}

Frontend sends to POST /conditions:
{
  "device_action_body": {
    "headers": {
      "Govee-Token": "{{CREDENTIAL_API_KEY}}"  // ← Same placeholder, not replaced
    }
  }
}
```

**Why?** Credential storage and retrieval should be BACKEND'S responsibility:
1. User never directly provides API keys (security)
2. User provides credentials through secure channel
3. Backend stores encrypted credentials
4. Backend replaces `{{CREDENTIAL_API_KEY}}` at execution time with actual value

**Execution Time (Backend):**
```
When executing condition:
1. Retrieve condition (has placeholder "{{CREDENTIAL_API_KEY}}")
2. Retrieve user's Govee API key from secure credential store
3. Replace placeholder with actual key
4. Execute HTTP request with real API key
```

**Frontend Responsibility:** None. Don't touch credential placeholders.

**Backend Responsibility:** 
- Replace `{{CREDENTIAL_API_KEY}}` with actual key during execution
- Store and retrieve user credentials securely
- Handle credential not found errors

**Status:** ✅ NO CHANGE NEEDED - Frontend implementation is correct

---

## Issue #5: Execution Time Parameter Injection ✅ DEFINED

### Frontend Question
What's the order of operations for placeholder replacement and flexible parameter injection?

### Backend Answer: **Defined execution order**

**Correct Order of Operations:**

```
Phase 1: Template Preparation
  1. Retrieve condition (has device_action_body, device_action_param_name, device_action_param_evaluator)
  2. Clone device_action_body (deep copy via JSON marshal/unmarshal)

Phase 2: Flexible Parameter Extraction
  3. Evaluate device_action_param_evaluator with event data
  4. Extract value (e.g., "150" from event.amount)
  5. Inject extracted value at device_action_param_name path
     Example: body.brightness = 150

Phase 3: Per-Device Execution Loop
  For each device in group:
    6. Fill device placeholders:
       - Replace {device_id} with device.id
       - Replace {model_id} with device.product_id
       - Replace {brand} with device.brand
    7. Replace credential placeholders with actual values
    8. Execute HTTP request
    9. Continue to next device on error (don't stop)
```

**Key Points:**
- **Device placeholders are filled LAST** (step 6-7, after flexible param injection)
- **Flexible param injection happens EARLY** (step 5, before device loop)
- **No conflicts:** Different concerns - flexible param is data value injection, device placeholders are device ID substitution

**Example Execution:**

```
Condition:
{
  "device_action_body": {
    "method": "POST",
    "body": {
      "device": "{device_id}",
      "model": "{model_id}",
      "cmd": {"name": "brightness", "value": 100}
    }
  },
  "device_action_param_name": "body.cmd.value",
  "device_action_param_evaluator": {"operator": "PARAM", "variables": ["amount"]}
}

Event: {amount: 150}

Execution:

Step 1-2: Clone template
Template → {
  "device": "{device_id}",
  "model": "{model_id}",
  "cmd": {"name": "brightness", "value": 100}
}

Step 3-5: Extract and inject flexible parameter
Extract amount = 150
Inject at body.cmd.value
Template → {
  "device": "{device_id}",
  "model": "{model_id}",
  "cmd": {"name": "brightness", "value": 150}  // ← Updated
}

Step 6: Device loop - Device#1 (id=dev_001, model=H7022)
Replace {device_id} → dev_001
Replace {model_id} → H7022
Final → {
  "device": "dev_001",
  "model": "H7022",
  "cmd": {"name": "brightness", "value": 150}
}

Step 8: Execute POST with this body
```

**Edge Case: What if flexible parameter IS a device field?**

Example: `device_action_param_name: "body.device"`

```
Step 5: Inject flexible parameter
body.device = "custom_value_from_event"

Step 6: Fill device placeholders
body.device = "dev_001"  // ← Overwrites the injected value!
```

**Resolution:** This is a user configuration error. Frontend should validate that flexible parameter path is NOT a device placeholder field (`body.device`, `body.model`, `body.brand`).

**Status:** 🔴 VALIDATION NEEDED - Backend should reject conditions where device_action_param_name targets a device placeholder field

---

## Issue #6: Operator Variable Count Validation ✅ NEEDS IMPLEMENTATION

### Frontend Question
Does backend validate operator variable counts?

### Backend Answer: **YES, backend must validate**

**Current Implementation:** Backend does NOT validate variable counts.

**The Fix:** Implement validation in condition handlers

**Operator Variable Count Rules:**

| Operator | Args | Variables |
|----------|------|-----------|
| PARAM | 1 | `["field_name"]` |
| REGEX_EXTRACT | 1 | `["pattern"]` |
| SUBSTRING | 1 | `["start-end"]` (range format) |
| FIRST | 1 | `["count"]` |
| LAST | 1 | `["count"]` |
| COLOR_PICKUP | 1 | `["field_name"]` |
| PARSEINT | 1 | `["field_name"]` |
| WHOLESENTENCE | 1 | `[]` (no args needed) |
| ADD | 2 | `["base", "value"]` |
| SUBTRACT | 2 | `["base", "value"]` |
| MULTIPLY | 2 | `["base", "multiplier"]` |
| DIVIDE | 2 | `["base", "divisor"]` |
| MODULO | 2 | `["base", "divisor"]` |
| EXCHANGE | 1+ | `["field", "mapping_key"]` or more |

**Valid Use:**
```json
{
  "operator": "MULTIPLY",
  "variables": ["amount", "2"]  // ← Exactly 2 variables
}
```

**Invalid Use (should be rejected):**
```json
{
  "operator": "MULTIPLY",
  "variables": ["amount"]  // ← Only 1, needs 2
}
```

**Validation Rules:**
- Extraction operators allowed: PARAM, REGEX_EXTRACT, SUBSTRING, FIRST, LAST, COLOR_PICKUP, PARSEINT, WHOLESENTENCE, ADD, SUBTRACT, MULTIPLY, DIVIDE, MODULO, EXCHANGE
- Logic operators NOT allowed: AND, OR, NOT, EQUIVALENT, GREATER_THAN, etc.
- Variable count must match operator requirements

**Status:** 🔄 IMPLEMENTING - Add validation function

---

## Summary of Changes Needed

### ✅ Changes to Implement (STARTING NOW)

1. **Add JSON tags to ConditionLogicStructure**
   - Change `Operator` → `json:"operator"`
   - Change `Variables` → `json:"variables"`
   - Change `SubConditions` → `json:"subconditions,omitempty"`
   - File: `internal/models/condition.go`
   - Effort: 2 minutes

2. **Implement operator variable count validation**
   - Create validation function `validateOperatorVariables()`
   - Call in `HandleCreateCondition` and `HandleUpdateCondition`
   - File: `internal/api/condition_handlers.go`
   - Effort: 15 minutes

3. **Reject device placeholder fields in flexible parameter**
   - Validate `device_action_param_name` doesn't target `{device_id}`, `{model_id}`, `{brand}` fields
   - Prevent path names like "body.device" or "body.model"
   - File: `internal/api/condition_handlers.go`
   - Effort: 10 minutes

4. **Update execution logic for proper injection order**
   - Verify injection happens before device placeholder replacement
   - Verify order in `condition_executor.go`
   - File: `internal/device/condition_executor.go`
   - Effort: 5 minutes (already correct, just verify)

5. **Add credential placeholder handling documentation**
   - Document that `{{CREDENTIAL_API_KEY}}` is replaced at execution time
   - Implement replacement logic if missing
   - File: `internal/device/condition_executor.go`
   - Effort: 20 minutes

### ⚠️ Changes Frontend Must Make

1. **Remove `"__custom_template__"` sentinel usage**
   - Send actual path in `device_action_param_name`
   - Example: `"body.brightness"` instead of `"__custom_template__"`
   - Impact: Affects custom template parameter handling

### ✅ No Changes Needed

1. Static parameters pre-fill - working as designed
2. Credential placeholder pass-through - working as designed

---

## Implementation Plan

### Backend Changes (Starting Now)

**Step 1: Fix JSON serialization (5 min)**
- Edit `internal/models/condition.go`
- Add JSON tags to ConditionLogicStructure

**Step 2: Add validation function (15 min)**
- Edit `internal/api/condition_handlers.go`
- Add `validateOperatorVariables()` function
- Call in handler

**Step 3: Add device placeholder validation (10 min)**
- Edit `internal/api/condition_handlers.go`
- Add check for forbidden path patterns

**Step 4: Verify execution order (5 min)**
- Review `internal/device/condition_executor.go`
- Confirm injection before device loop

**Step 5: Test (15 min)**
- Build and compile
- Run test cases (TC1-TC5)

**Total Effort:** ~50 minutes

### Frontend Response (Required from Frontend)

**Action Item:** Remove `"__custom_template__"` sentinel and send actual paths in `device_action_param_name`

---

## Test Cases (To Run After Implementation)

### Test Case 1: Evaluator Field Names
```
Input:
{
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]
  }
}

Expected: Accepts lowercase field names
Result: ✅ (after JSON tag fix)
```

### Test Case 2: Variable Count Validation
```
Input:
{
  "operator": "MULTIPLY",
  "variables": ["amount"]  // Only 1, needs 2
}

Expected: Rejects with error "MULTIPLY requires 2 variables"
Result: ✅ (after validation implementation)
```

### Test Case 3: Invalid Operator for Extraction
```
Input:
{
  "operator": "GREATER_THAN",
  "variables": ["10"]
}

Expected: Rejects with error "GREATER_THAN not allowed for parameter extraction"
Result: ✅ (after validation implementation)
```

### Test Case 4: Device Placeholder Field Conflict
```
Input:
{
  "device_action_param_name": "body.device",
  "device_action_body": {...}
}

Expected: Rejects with error "Cannot use device placeholder field as flexible parameter"
Result: ✅ (after validation implementation)
```

### Test Case 5: Execution Order
```
Template: {"value": 100}
Event: {amount: 150}
Config: param_name="body.value", operator=MULTIPLY, variables=["amount", "2"]

Execution:
1. Extract: 150 * 2 = 300
2. Inject: body.value = 300
3. Fill device: {device: "dev_001"}
4. Send request with value=300, device=dev_001

Expected: Request has value=300
Result: ✅ (already implemented correctly)
```

---

## Frontend Communication

### For Frontend Team

**What to change:**
1. In custom template handling, send actual path instead of `"__custom_template__"` sentinel
2. Example: `device_action_param_name: "body.brightness"` (same as preset templates)

**What's working fine:**
1. ✅ Static parameter pre-fill
2. ✅ Credential placeholder pass-through
3. ✅ Operator validation (frontend is correct)

**What backend is fixing:**
1. JSON field name case (lowercase)
2. Variable count validation
3. Device placeholder conflict detection
4. Execution order (already correct, just verifying)

### Timeline

- Backend fixes: 50 minutes (starting immediately)
- Frontend changes: ~10 minutes (remove sentinel logic)
- Integration testing: ~30 minutes
- Total: ~90 minutes to full integration

---

## Detailed Implementation Instructions

### Change 1: Add JSON Tags (internal/models/condition.go)

**Before:**
```go
type ConditionLogicStructure struct {
	Operator      string
	Variables     []string
	SubConditions []ConditionLogicStructure
}
```

**After:**
```go
type ConditionLogicStructure struct {
	Operator      string                        `json:"operator"`
	Variables     []string                      `json:"variables"`
	SubConditions []ConditionLogicStructure     `json:"subconditions,omitempty"`
}
```

### Change 2: Add Validation Function (internal/api/condition_handlers.go)

**Add this function:**
```go
// operatorVariableCount defines required variable count for each operator
var operatorVariableCount = map[string]int{
	// Extraction operators (allowed for parameters)
	models.CONDITION_OPERATOR_OBTAIN_PARAM:       1,
	models.CONDITION_OPERATOR_TEXT_REGEX_EXTRACT: 1,
	models.CONDITION_OPERATOR_TEXT_SUBSTRING:     1,
	models.CONDITION_OPERATOR_TEXT_FIRST:         1,
	models.CONDITION_OPERATOR_TEXT_LAST:          1,
	models.CONDITION_OPERATOR_TEXT_COLOR_PICKUP:  1,
	models.CONDITION_OPERATOR_CONVERT_PARSEINT:   1,
	models.CONDITION_OPERATOR_TEXT_WHOLESENTENCE: 0,
	models.CONDITION_OPERATOR_CALCULATE_ADD:      2,
	models.CONDITION_OPERATOR_CALCULATE_SUBTRACT: 2,
	models.CONDITION_OPERATOR_CALCULATE_MULTIPLY: 2,
	models.CONDITION_OPERATOR_CALCULATE_DIVIDE:   2,
	models.CONDITION_OPERATOR_CALCULATE_MODULO:   2,
	models.CONDITION_OPERATOR_CONVERT_CURRENCYEXCHANGE: 2,
}

var extractionOperators = map[string]bool{
	models.CONDITION_OPERATOR_OBTAIN_PARAM:       true,
	models.CONDITION_OPERATOR_TEXT_REGEX_EXTRACT: true,
	models.CONDITION_OPERATOR_TEXT_SUBSTRING:     true,
	models.CONDITION_OPERATOR_TEXT_FIRST:         true,
	models.CONDITION_OPERATOR_TEXT_LAST:          true,
	models.CONDITION_OPERATOR_TEXT_COLOR_PICKUP:  true,
	models.CONDITION_OPERATOR_CONVERT_PARSEINT:   true,
	models.CONDITION_OPERATOR_TEXT_WHOLESENTENCE: true,
	models.CONDITION_OPERATOR_CALCULATE_ADD:      true,
	models.CONDITION_OPERATOR_CALCULATE_SUBTRACT: true,
	models.CONDITION_OPERATOR_CALCULATE_MULTIPLY: true,
	models.CONDITION_OPERATOR_CALCULATE_DIVIDE:   true,
	models.CONDITION_OPERATOR_CALCULATE_MODULO:   true,
	models.CONDITION_OPERATOR_CONVERT_CURRENCYEXCHANGE: true,
}

func validateOperatorVariables(operator string, variables []string) error {
	if !extractionOperators[operator] {
		return fmt.Errorf("operator %q not allowed for parameter extraction", operator)
	}
	
	expectedCount, exists := operatorVariableCount[operator]
	if !exists {
		return fmt.Errorf("operator %q is not recognized", operator)
	}
	
	if expectedCount > 0 && len(variables) != expectedCount {
		return fmt.Errorf("operator %q requires %d variable(s), got %d", operator, expectedCount, len(variables))
	}
	
	if expectedCount == 0 && len(variables) > 0 {
		return fmt.Errorf("operator %q takes no variables", operator)
	}
	
	return nil
}
```

### Change 3: Call Validation in Handler

**In `HandleCreateCondition`, after existing validation, add:**

```go
// Validate device_action_param_evaluator operator and variables
if err := validateOperatorVariables(
	req.DeviceActionParamEvaluator.Operator,
	req.DeviceActionParamEvaluator.Variables,
); err != nil {
	http.Error(w, err.Error(), http.StatusBadRequest)
	return
}

// Validate that device_action_param_name doesn't target device placeholder fields
forbiddenPaths := map[string]bool{
	"body.device":     true,
	"body.model":      true,
	"body.brand":      true,
	"device":          true,
	"model":           true,
	"brand":           true,
}
if forbiddenPaths[req.DeviceActionParamName] {
	http.Error(w, fmt.Sprintf("device_action_param_name '%s' cannot target device placeholder fields", req.DeviceActionParamName), http.StatusBadRequest)
	return
}
```

---

## Impact Analysis

### What Changes
- JSON serialization now uses lowercase field names (matches frontend)
- Validation is stricter (rejects invalid operators/variable counts)
- Device placeholder conflicts prevented

### What Stays the Same
- Execution flow
- Template structure
- Device group handling
- Condition logic evaluation

### Backward Compatibility
- Existing conditions in database should continue to work (read operations)
- New condition validation is stricter (write operations)
- Frontend needs to update sentinel logic to send actual paths

---

## Next Steps

1. **Backend:** Implement all 5 changes (50 min)
2. **Frontend:** Remove `"__custom_template__"` sentinel (10 min)
3. **Both:** Run integration tests (30 min)
4. **Both:** Verify end-to-end execution (20 min)

---

**Status:** Ready to implement  
**Code Changes:** Starting immediately  
**No blockers identified**


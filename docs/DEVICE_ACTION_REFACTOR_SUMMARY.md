# Device Action Refactor: Per-Field Conditional Logic

## Overview
Refactored the condition system from a **single dynamic parameter model** to a **per-field conditional logic model**. Each field in `device_action_body` can now be either:
- A **static value** (string, number, boolean, etc.)
- A **ConditionLogicStructure** (dynamic value evaluated from the event)

## What Changed

### Database Schema
**Required ALTER statements** (PostgreSQL):
```sql
ALTER TABLE conditions DROP COLUMN IF EXISTS device_action_param_name;
ALTER TABLE conditions DROP COLUMN IF EXISTS device_action_param_evaluator;
```

The `device_action_body` JSONB column is retained and now contains mixed static/dynamic values.

### Data Model
**Removed from `models.Condition`:**
- `DeviceActionParamName` (string)
- `DeviceActionParamEvaluator` (ConditionLogicStructure)

**Retained in `models.Condition`:**
- `DeviceActionBody` (interface{}) - Now supports per-field conditional logic

### API Structures

#### Request Types
**CreateConditionRequest** and **UpdateConditionRequest:**
- Removed: `DeviceActionParamName`, `DeviceActionParamEvaluator`
- Retained: `DeviceActionBody` (with per-field logic support)

#### Test Response Types
**TestDraftLogicResponse** and **TestConditionResponse:**
- Removed: `FlexibleParameterValue` (single parameter)
- Added: `ResolvedActionBody` (complete resolved body with all fields)

### Validation Logic

**Old validation** (REMOVED):
- Required `DeviceActionParamName` to be non-empty
- Required `DeviceActionParamEvaluator.Operator` to be set
- Required param name to exist in body template
- Validated single parameter path

**New validation** (IMPLEMENTED):
- `DeviceActionBody` must be a JSON object
- Must have at least one field
- Each field can be static OR dynamic (ConditionLogicStructure)
- If field is dynamic (has "Operator"), validate its operator and variables
- No restrictions on field paths

### Execution Logic

**Old execution** (REMOVED):
```go
// Single parameter injection
finalBody := cloneAndInjectParameter(
    cond.DeviceActionBody,
    cond.DeviceActionParamName,  // ← removed
    flexibleParamValue,           // ← single value
)
```

**New execution** (IMPLEMENTED):
```go
// Per-field evaluation
finalBody := make(map[string]interface{})
for fieldName, fieldValue := range deviceActionBody {
    if isConditionLogicStructure(fieldValue) {
        // Evaluate dynamic field
        finalBody[fieldName] = evaluateField(fieldValue, event)
    } else {
        // Use static value
        finalBody[fieldName] = fieldValue
    }
}
```

## Example Payloads

### Old Format (DEPRECATED)
```json
{
  "device_action_body": {
    "brightness": 50,
    "color": "white",
    "duration": 500
  },
  "device_action_param_name": "brightness",
  "device_action_param_evaluator": {
    "Operator": "PARAM",
    "Variables": ["75"]
  }
}
```
Result: Only `brightness` field was dynamic (set to 75), others static.

### New Format (CURRENT)
```json
{
  "device_action_body": {
    "color": "#FFFF00",
    "brightness": {
      "Operator": "WHOLESENTENCE",
      "Variables": [],
      "SubConditions": [
        {
          "Operator": "REGEX_EXTRACT",
          "Variables": ["brightness(1)"],
          "SubConditions": [
            {
              "Operator": "PARAM",
              "Variables": ["content"]
            }
          ]
        }
      ]
    },
    "durationSeconds": {
      "Operator": "WHOLESENTENCE",
      "Variables": [],
      "SubConditions": [
        {
          "Operator": "REGEX_EXTRACT",
          "Variables": ["duration(1)"],
          "SubConditions": [
            {
              "Operator": "PARAM",
              "Variables": ["content"]
            }
          ]
        }
      ]
    }
  }
}
```
Result: `color` is static (#FFFF00), `brightness` and `durationSeconds` are dynamically evaluated.

## Files Modified

### Core Files
1. **internal/auth/db.go**
   - Updated migration to drop obsolete columns

2. **internal/models/condition.go**
   - Removed DeviceActionParamName and DeviceActionParamEvaluator fields
   - Updated documentation

3. **internal/store/sql_condition_store.go**
   - Updated scanCondition() to skip obsolete columns
   - Updated CreateCondition() and UpdateCondition() SQL queries
   - Simplified marshaling (no longer marshal unused fields)

4. **internal/api/condition_handlers.go**
   - Updated CreateConditionRequest structure
   - Updated UpdateConditionRequest structure
   - Rewrote validation logic for per-field structure
   - Removed old parameter name/evaluator validation

5. **internal/device/condition_executor.go**
   - Completely rewrote executeWithTemplate() for per-field evaluation
   - Each field is now evaluated independently
   - Removed cloneAndInjectParameter() usage
   - Simplified placeholder replacement flow

6. **internal/api/condition_test_handlers.go**
   - Updated TestDraftLogicRequest/Response structures
   - Updated TestConditionResponse structure
   - Rewrote HandleTestDraftLogic() for per-field evaluation
   - Rewrote HandleTestCondition() for per-field evaluation
   - Updated HandleTestAllConditions() to remove flexible parameter evaluation

## Migration Steps

### Portal Client Contract

The condition page sends `device_group_id` and `device_action_body` as **top-level
request fields**, for both create/update and draft tests. `device_action_body`
is the parameter object itself, **not** an HTTP envelope containing `method`,
`url`, `headers`, and `body`. For preset templates, the portal uses the parsed
`body_template` as the starting parameter object. Custom JSON uses the same
parameter-only format.

```json
{
  "device_group_id": "selected-group-id",
  "device_action_body": {
    "color": "#FFFF00",
    "brightness": {
      "Operator": "WHOLESENTENCE",
      "Variables": [],
      "SubConditions": [
        { "Operator": "PARAM", "Variables": ["content"] }
      ]
    }
  }
}
```

Each top-level field has its own static/event-derived configuration, including
custom templates. Static inputs accept plain text or JSON values; quote a string
such as `"50"` to keep it a string rather than a number. Nested objects are
edited as static JSON, not flattened into dynamic dot paths. Evaluation inside
nested objects is not supported by this refactor.

The page reloads `device_group_id` and `device_action_body` from the saved
condition, and draft test results include the backend's `resolved_action_body`.
The legacy `device_action_params` wrapper and the removed single-parameter
fields are not sent by the condition editor. Legacy conditions are not
automatically converted.

### For Existing Database
1. **Backup database** (important!)
2. **Run ALTER statements**:
   ```sql
   ALTER TABLE conditions DROP COLUMN IF EXISTS device_action_param_name;
   ALTER TABLE conditions DROP COLUMN IF EXISTS device_action_param_evaluator;
   ```
3. **Redeploy application** with updated code

### For New Installations
- Database schema automatically created with correct structure (no obsolete columns)

## API Compatibility

### Breaking Changes
- **POST /conditions** - Request body format changed
- **PATCH /conditions/update** - Request body format changed
- **POST /conditions/test-draft** - Request/response format changed
- **POST /conditions/:id/test** - Response format changed

### Migration Guide for Clients
**Old:**
```json
{
  "device_action_body": { "brightness": 50 },
  "device_action_param_name": "brightness",
  "device_action_param_evaluator": { "Operator": "PARAM", "Variables": ["75"] }
}
```

**New:**
```json
{
  "device_action_body": {
    "brightness": { "Operator": "PARAM", "Variables": ["75"] }
  }
}
```

## Testing Recommendations

1. **Unit Tests**: Verify per-field evaluation logic
2. **Integration Tests**: Test device execution with mixed static/dynamic fields
3. **Migration Tests**: Verify existing conditions still work post-migration
4. **API Tests**: Verify validation accepts both static and dynamic fields

## Backward Compatibility
⚠️ **NOT backward compatible** - This is a breaking API change.
- Old conditions saved in database will need schema migration
- Old API clients will need to update to new request format
- No auto-conversion provided (intentional to force clean migration)

## Future Improvements
- [ ] Support nested field paths (e.g., "params.brightness" for `{params: {brightness: ...}}`)
- [ ] Support array field values
- [ ] Support conditional field inclusion (fields that appear/disappear based on logic)
- [ ] Performance optimization for large field counts

# Test & Submit Actions - Quick Reference

## What Was Done

✅ **Test Action Implementation**
- Test modal UI added to condition page
- Event type selector with parameter form
- Test execution with sample event
- Results display (matched, extracted value, errors)

✅ **Submit Action Enhancement**
- Updated to handle new `device_action_body` structure
- Full validation for device action parameters
- Operator validation (14 allowed extraction operators)
- Placeholder validation ({device_id}, {model_id})
- Error handling with user feedback

✅ **Build Status**
- Zero compilation errors
- Zero warnings
- Ready to run

---

## How to Test

### Quick Test in Browser

1. **Start the server** (F5 in VSCode as usual)
2. **Navigate to a condition page**
3. **Fill in condition logic** (or create simple condition)
4. **Select device group** (if device action needed)
5. **Click "Test Condition"** button
   - Event type selector appears
   - Enter test values
   - Click "Test Condition" to see results
6. **Click "Submit"** button
   - Condition saves
   - Redirects to conditions list on success

### What to Check

**Test Functionality:**
- [ ] Modal opens when clicking "Test Condition"
- [ ] Event types load correctly
- [ ] Parameter form displays
- [ ] Test executes without errors
- [ ] Results show matched status
- [ ] Extracted values display if applicable

**Submit Functionality:**
- [ ] Form validates before submission
- [ ] Shows "Saving..." state
- [ ] Redirects to conditions list on success
- [ ] Shows error message if validation fails
- [ ] Device action body structure is correct

---

## File Changes Summary

### `/public/js/condition.js`
- Updated `runConditionTest()` function to:
  - Collect test parameters from form
  - Generate sample event using backend metadata
  - Call `/api/conditions/test-draft` endpoint
  - Display results in modal

### `/templates/pages/condition.html`
- Added `testConditionModal` HTML element
- Updated `submitCondition()` to:
  - Extract device_action_body components
  - Validate all required fields
  - Send correct API structure to backend
  - Handle errors gracefully

---

## API Contract

### Test Endpoint
```
POST /api/conditions/test-draft
Content-Type: application/json

{
  "condition_logic": {...},
  "test_event": {...},
  "device_action_params": {
    "device_action_body": {...},
    "device_action_param_name": "body.brightness",
    "device_action_param_evaluator": {...}
  }
}

Response:
{
  "matched": true/false,
  "would_trigger": true/false,
  "computed_values": [...],
  "execution_error": null/error_message
}
```

### Submit Endpoint
```
POST /api/conditions
PATCH /api/conditions/update?id={id}
Content-Type: application/json

{
  "name": "...",
  "event_type": "...",
  "is_enabled": true,
  "condition_logic": {...},
  "device_action_body": {...},
  "device_action_param_name": "body.brightness",
  "device_action_param_evaluator": {...},
  "watch_id": "..." (POST only)
}
```

---

## Validation Rules

### Device Action Required
- Method (GET/POST/PUT/PATCH)
- URL (endpoint)
- Body (JSON with parameters)

### Placeholders Required
- {device_id} - device identifier
- {model_id} - device model

### Flexible Parameter Validation
- Operator must be in allowed list
- Path must exist in body
- Evaluator must be valid JSON

### Allowed Operators (14)
- Extract: PARAM, REGEX_EXTRACT, SUBSTRING, FIRST, LAST, COLOR_PICKUP, WHOLESENTENCE
- Convert: PARSEINT, EXCHANGE
- Calculate: ADD, SUBTRACT, MULTIPLY, DIVIDE, MODULO

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal won't open | Check condition logic is valid JSON |
| Test shows no results | Check test endpoint exists at `/api/conditions/test-draft` |
| Submit fails | Check error message, verify device action structure |
| Parameters don't appear | Check event type is selected |
| Validation error | Check template has {device_id} and {model_id} |

---

## Next: Integration Testing

When backend is ready:
1. Verify test endpoint works: `POST /api/conditions/test-draft`
2. Verify submit endpoint works: `POST /api/conditions`
3. Test with real device groups and templates
4. Test error scenarios
5. Verify devices receive commands

---

**Status:** Ready for testing ✅  
**Build:** Clean ✅  
**Next:** Backend integration & end-to-end testing  

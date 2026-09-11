# Backend Data Requirements — Updated

## Issue Found & Fixed

When `allow_device_test: true` was returned by the API, the frontend was showing the old "Test Credentials" button instead of the new device test section.

**Cause:** Frontend button logic wasn't properly distinguishing between the old and new testing approaches.

**Fix Applied:** Frontend now correctly shows:
- **New device test section** (inline) when `allow_device_test: true`
- **Old test credentials button** (footer) when `allow_credential_test: true` (and `allow_device_test` is not true)

---

## What Backend Needs to Send

When returning setup guide steps, use ONE of these approaches (not both):

### Approach 1: NEW (Recommended) - Device Test Feature

```json
{
  "step_type": "credentials",
  "title": "Enter API Key",
  "content": "Get your API key from...",
  "requires_credentials": true,
  
  "allow_device_test": true,                    // ← NEW
  "device_test_label": "Test Connection",       // ← NEW (optional)
  "device_test_help": "Verify the API key...",  // ← NEW (optional)
  
  "credential_fields": [
    {
      "id": "api_key",
      "label": "Govee API Key",
      "type": "password",
      "help": "Get from Govee account settings",
      "placeholder": "..."
    }
  ]
}
```

**Result on Frontend:**
- ✅ Device test section appears below credentials (inline)
- ✅ Optional checkbox: "Attempt to connect with this key"
- ✅ Test button (disabled until checkbox checked)
- ✅ Results show inline (device list or error)
- ❌ Old "Test Credentials" button does NOT appear

---

### Approach 2: OLD (Backward Compatibility) - Credential Test

```json
{
  "step_type": "credentials",
  "title": "Enter API Key",
  "content": "Get your API key from...",
  "requires_credentials": true,
  
  "allow_credential_test": true,  // ← OLD (kept for compatibility)
  
  "credential_fields": [
    {
      "id": "api_key",
      "label": "Govee API Key",
      "type": "password",
      "help": "Get from Govee account settings",
      "placeholder": "..."
    }
  ]
}
```

**Result on Frontend:**
- ✅ "Test Credentials" button appears in modal footer
- ❌ Device test section does NOT appear
- User must click "Test" → system tests → may loop back if fails

---

## CRITICAL: Which One to Use?

### For NEW implementations (Preferred):
```json
"allow_device_test": true,                   // Use this
// DON'T send allow_credential_test or set it to false
```

### For OLD implementations (Legacy):
```json
"allow_credential_test": true,               // Use this
// DON'T send allow_device_test or set it to false
```

### DO NOT MIX:
❌ Don't send both `allow_device_test: true` AND `allow_credential_test: true`
❌ Frontend will prioritize new approach if both present

---

## Migration Steps

If migrating from old to new:

**Step 1:** Update your setup guide data to return:
```json
{
  "allow_device_test": true,           // Add this
  "device_test_label": "Test Connection",    // Add this
  "device_test_help": "Verify...",     // Add this
  
  // Remove or set to false:
  "allow_credential_test": false       // Or omit entirely
}
```

**Step 2:** Frontend automatically adapts:
- Old test button disappears
- New device test section appears
- User experience improves

**Step 3:** Zero breaking changes:
- Users without manual setup unaffected
- Existing connections still work
- Just better UX going forward

---

## Example: Govee Brand

### Current (if using OLD approach):
```json
{
  "order": 2,
  "title": "Enter API Key",
  "requires_credentials": true,
  "allow_credential_test": true,
  "credential_fields": [...]
}
```

### Migrated (NEW approach):
```json
{
  "order": 2,
  "title": "Enter API Key",
  "requires_credentials": true,
  "allow_device_test": true,
  "device_test_label": "Test Connection",
  "device_test_help": "Verify the API key works by checking connected devices",
  "credential_fields": [...]
}
```

---

## Testing Checklist for Backend

- [ ] Setup guide returns either `allow_device_test` OR `allow_credential_test` (not both)
- [ ] New fields present when using device test approach:
  - [ ] `allow_device_test: true`
  - [ ] `device_test_label` (optional)
  - [ ] `device_test_help` (optional)
- [ ] Old fields absent or false when using new approach
- [ ] Test in frontend:
  - [ ] Device test section appears with checkbox
  - [ ] Old "Test Credentials" button does NOT appear
  - [ ] Test button works and shows results

---

## Backward Compatibility

✅ **Fully backward compatible:**
- Old API (with `allow_credential_test`) still works
- New API (with `allow_device_test`) works
- Frontend detects which one to use automatically
- Can migrate gradually per brand

---

## No API Endpoint Changes Needed

✅ Existing endpoints work as-is:
- `GET /brand/{id}/setup-guide` — Just extend response with new fields
- `POST /auth/brand/{id}/connect` — No changes
- `POST /auth/brand/{id}/test` — No changes

---

## Questions?

**Q: Should I update all brands at once?**  
A: No, update one brand and test first. Then roll out to others.

**Q: What if I only have `allow_credential_test`?**  
A: Frontend still works with old approach. Migrate when ready.

**Q: Can I use both fields?**  
A: Technically yes, but frontend will use `allow_device_test` if both present.

**Q: What about database schema?**  
A: Just add the new columns if not present. Existing data can stay as-is.

---

## Success Criteria

✅ Backend sends either `allow_device_test: true` OR `allow_credential_test: true`  
✅ Frontend shows correct UI for the approach  
✅ Device test section appears for device test approach  
✅ Old test button appears for credential test approach  
✅ No mixing of both approaches  
✅ No errors in browser console  


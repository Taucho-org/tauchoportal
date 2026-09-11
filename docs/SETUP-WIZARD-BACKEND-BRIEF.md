# Setup Wizard Redesign — Backend Brief

## TL;DR

**What we want:** Better UX by validating credentials on save (instead of separate test step) + optional device connection test (separate from step progression).

**What we need from backend:** 4 new/updated fields + auto-validation on credential save + optional device test endpoint.

**Effort:** ~3-6 hours (Phase 1: 2-3 hrs | Phase 2: 2-3 hrs)

---

## The Problem (Current State)

Users go through 4 steps to set up Govee/Tuya/etc:
1. Intro (information)
2. Enter API Key (input)
3. Test Key (separate step—can fail and loop back)
4. Confirm (done)

This feels redundant. Step 3 (test) blocks progression and is the main point of frustration.

---

## The Solution (What Frontend Wants)

Drop it to 3 logical steps:
1. Intro
2. Enter API Key + **Optional** Device Test (non-blocking)
3. Confirm

The key changes:
- ✅ Validate credentials **on save** (not in separate step)
- ✅ Device test is **optional** (doesn't block wizard)
- ✅ Device test is **separate** from credential validation

---

## What to Implement

### Phase 1 (Required, ~2-3 hrs)

**1. Add 4 fields to step response:**

When returning setup wizard steps (`GET /auth/brand/{brand_id}/setup-guide`), add:

```json
{
  "step_type": "credentials",  // NEW: "info" | "credentials" | "confirm"
  "allow_device_test": true,   // NEW: Boolean
  "device_test_label": "Test Connection",  // NEW: Optional custom label
  "device_test_help": "Verify the API key works"  // NEW: Optional help text
}
```

**2. Always validate credentials on save:**

In `POST /auth/brand/{brand_id}/save-credentials`:
- Validate credentials BEFORE saving to database
- Return validation result in response
- Block save if validation fails (HTTP 422)

```json
{
  "success": true,  // or false if validation failed
  "validation": {
    "is_valid": true,
    "message": "✅ API key verified",
    "error": null,
    "suggestion": null
  }
}
```

### Phase 2 (Recommended, ~2-3 hrs)

**3. Create optional device test endpoint:**

New endpoint: `POST /auth/brand/{brand_id}/test-device-connection`

Purpose: Test device connectivity (separate from save)

```json
// Request
{
  "credentials": { "api_key": "..." }
}

// Response
{
  "is_connected": true,
  "device_count": 3,
  "devices": [
    { "id": "...", "name": "Light 1", "status": "online" },
    { "id": "...", "name": "Light 2", "status": "offline" }
  ]
}
```

**Can be called:**
- Multiple times without side effects
- Independently of save (doesn't save anything)
- Async by frontend (doesn't block UI)

---

## API Changes Detail

### Request to `POST /auth/brand/{brand_id}/save-credentials`

```json
{
  "step_number": 1,
  "credentials": { "api_key": "..." },
  "skip_validation": false,          // NEW: Optional
  "test_device_connection": false    // NEW: Optional
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "Credentials saved",
  
  "validation": {
    "is_valid": true,
    "message": "✅ API key verified",
    "error": null
  },
  
  "device_test": null  // Null if not requested
}
```

### Response (Validation Failed)

```json
{
  "success": false,
  
  "validation": {
    "is_valid": false,
    "error": "Invalid API key",
    "suggestion": "Check your Govee account settings"
  }
}
```

---

## Example: Govee Brand

Current step response:
```json
{
  "order": 2,
  "title": "Enter API Key",
  "requires_credentials": true,
  "allow_credential_test": true,
  "credential_fields": [...]
}
```

New step response:
```json
{
  "order": 2,
  "title": "Enter API Key",
  "step_type": "credentials",          // NEW
  "requires_credentials": true,
  "allow_device_test": true,           // NEW (replaces allow_credential_test)
  "device_test_label": "Test Connection",  // NEW
  "device_test_help": "Verify the API key works by checking your connected devices",  // NEW
  "credential_fields": [...]
}
```

---

## Implementation Checklist

**Phase 1 (Do first):**
- [ ] Add `step_type`, `allow_device_test`, `device_test_label`, `device_test_help` to step response
- [ ] Update save endpoint to always validate credentials on save
- [ ] Return validation result in save response
- [ ] Block save if validation fails (HTTP 422)
- [ ] Test with Govee, Tuya, and at least one other brand

**Phase 2 (Do next):**
- [ ] Create `POST /auth/brand/{brand_id}/test-device-connection` endpoint
- [ ] Endpoint retrieves device list without saving credentials
- [ ] Can be called multiple times safely
- [ ] Test async behavior (frontend calls while waiting on other steps)

**Phase 3 (Optional, can skip):**
- [ ] Deprecate `allow_credential_test` field
- [ ] Deprecate old test endpoint (if exists separately)

---

## Frontend Will Handle

✅ Render new step layout with credentials + optional test section  
✅ Call save endpoint (which now validates)  
✅ Handle validation errors inline  
✅ Call device test endpoint async (if user clicks test)  
✅ Display device list when test completes  
✅ Reload page after final save  

---

## Testing After Implementation

1. **Credential validation on save:**
   - Save with valid API key → should succeed
   - Save with invalid API key → should fail with `HTTP 422`

2. **Device test endpoint:**
   - Call with valid credentials → should return device list
   - Call with invalid credentials → should return error (still `HTTP 200`)
   - Call multiple times → should work each time

3. **Wizard flow:**
   - User enters API key → clicks Save → credentials validated
   - If valid: wizard progresses to next step
   - If invalid: error shown, user stays on step
   - User clicks "Test Connection" → device list loads async
   - Device test failure doesn't block "Next" button

---

## Questions for Backend Team

1. Does the save endpoint currently validate credentials? Or skip validation?
2. Should device test endpoint be new, or extend existing test endpoint?
3. Should device test count toward API rate limits?
4. Should we validate credentials schema before calling brand API (fail fast)?

---

## Documentation Location

- **Design overview:** `/docs/SETUP-WIZARD-REDESIGN.md`
- **Detailed requirements:** `/docs/SETUP-WIZARD-API-REQUIREMENTS.md`
- **API spec updates:** `/docs/SETUP-WIZARD-API-UPDATES.md`
- **This brief:** `/docs/SETUP-WIZARD-BACKEND-BRIEF.md`

---

## Why This is Better

| Aspect | Current | New |
|--------|---------|-----|
| **Steps** | 4 | 3 |
| **Time to connect** | 60-90 sec | 30-45 sec |
| **Test fails?** | Loops back to step 2 | Shows error, stays on step |
| **Testing** | Mandatory | Optional |
| **Device check** | Blocks progression | Non-blocking |
| **UX clarity** | Confusing | Clear |

---

## Timeline

- **This week:** Backend implements Phase 1
- **Next week:** Frontend integrates + tests
- **Following week:** Backend implements Phase 2 (optional)
- **Final:** Frontend ships new wizard UI

---

## Success Criteria

✅ Credentials validated on save (blocking if invalid)  
✅ Device test works independently (non-blocking)  
✅ Setup wizard completes in 3 steps (not 4)  
✅ No regression on existing brands (Govee, Tuya, Hue, etc.)  
✅ Error messages are human-readable with suggestions  


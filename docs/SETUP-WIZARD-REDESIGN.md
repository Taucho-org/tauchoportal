# Brand Setup Wizard — Design Redesign

## Overview

The current setup wizard uses a multi-step flow where credential entry and testing are separate steps:
```
Step 1: Description
  ↓
Step 2: Enter API Key
  ↓
Step 3: Test the Key (separate step)
  ↓
Step 4: Close
```

**Problem:** This feels like 4 steps when it's really 2 logical concepts (registration + optional testing).

## Proposed New Design

```
Step 1: Description
  ↓
Step 2: Enter API Key + Auto-Validate on Save
         + Optional Device Connection Test (inline section, not a step)
  ↓
Step 3+: Continue through remaining steps
  ↓
Final Step: Close & Reload
```

### UI Layout for Credential Step

```
┌─ Setup Wizard Dialog ────────────────────────────────┐
│                                                      │
│ STEP 1: Enter API Key                               │
│ ─────────────────────────────────────────────────── │
│ [API Key input field]                               │
│ ✓ Key validated!  (auto-validated on save)          │
│                                                      │
│ 📋 Optional: Test Device Connection                 │
│ ─────────────────────────────────────────────────── │
│ □ Attempt to connect with this key                  │
│ [Test Connection] (disabled if no key)              │
│                                                      │
│ ┌─ Connection Test Results (if tested) ──────────┐  │
│ │ ✅ Connected successfully!                     │  │
│ │ Found 3 devices:                               │  │
│ │ • Living Room Light (online)                   │  │
│ │ • Bedroom Light (offline)                      │  │
│ │ • Kitchen Light (online)                       │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [Back] [Next ▶] [Save]                              │
└──────────────────────────────────────────────────────┘
```

**Key changes:**
1. **Validation happens on save** — credentials are validated server-side before saving
2. **Device test is optional** — user can skip it, or check box to enable
3. **Test results shown inline** — no page navigation, stays in same step
4. **Save button always available** — user can proceed with just registration

## API Changes Required

### 1. Step Response Structure (Extended)

**Current structure:**
```json
{
  "order": 1,
  "title": "Enter API Key",
  "content": "...",
  "requires_credentials": true,
  "allow_credential_test": true,
  "credential_fields": [...]
}
```

**New structure:**
```json
{
  "order": 1,
  "title": "Enter API Key",
  "content": "...",
  "step_type": "credentials",           // NEW: "credentials" | "info" | "confirm"
  
  "requires_credentials": true,
  "credential_fields": [...],
  
  "allow_device_test": true,            // NEW: Optional device connection test
  "device_test_label": "Test Connection",     // NEW: Customizable button label
  "device_test_help": "Verify the API key...", // NEW: Help text for test section
  
  // REMOVE allow_credential_test (fold into validation on save)
}
```

**Rationale:**
- `step_type` clarifies the purpose of the step (supports future step types)
- `allow_device_test` replaces `allow_credential_test` to clarify it tests device connectivity, not just credentials
- Device test is optional, independent of step progression
- Credentials are **always** validated on save (no separate test step needed)

### 2. Save Credentials Endpoint (Updated)

**Current:**
```
POST /auth/brand/{brand_id}/save-credentials
{
  "step_number": 1,
  "credentials": { "api_key": "..." }
}
```

**New:**
```
POST /auth/brand/{brand_id}/save-credentials
{
  "step_number": 1,
  "credentials": { "api_key": "..." },
  "skip_validation": false,  // NEW: Optional — default false
  "test_device_connection": false  // NEW: Optional — separate from validation
}
```

**Response (same for both validation and save):**
```json
{
  "success": true,
  "message": "Credentials saved successfully",
  "validation": {
    "is_valid": true,
    "message": "✅ API key verified",
    "error": null
  },
  "device_test": null  // Null if test_device_connection was false
}
```

**Validation errors still prevent save:**
```json
{
  "success": false,
  "validation": {
    "is_valid": false,
    "error": "Invalid API key. Check your Govee app settings.",
    "suggestion": "Try regenerating the key in your account settings"
  },
  "device_test": null
}
```

### 3. Device Connection Test Endpoint (NEW OPTIONAL)

Could use the existing `POST /auth/brand/{brand_id}/test` endpoint, but propose a **separate call** to avoid blocking the UI:

**Endpoint:**
```
POST /auth/brand/{brand_id}/test-device-connection
{
  "credentials": { "api_key": "..." }
}
```

**Response (success):**
```json
{
  "is_connected": true,
  "message": "Connected successfully!",
  "device_count": 3,
  "devices": [
    { "id": "device_1", "name": "Living Room Light", "status": "online" },
    { "id": "device_2", "name": "Bedroom Light", "status": "offline" },
    { "id": "device_3", "name": "Kitchen Light", "status": "online" }
  ]
}
```

**Response (failure):**
```json
{
  "is_connected": false,
  "error": "Could not connect with these credentials",
  "suggestion": "Try a different API key or check if the API has changed"
}
```

**Notes:**
- This is **optional** — only called if user clicks "Test Connection" checkbox
- Does **not** block step progression
- Can be called multiple times without side effects
- Async UI: Show loading spinner while testing, populate results when ready

### 4. Wizard Setup Guide Response (Unchanged)

The `GET /auth/brand/{brand_id}/setup-guide` response structure remains mostly the same, but steps now include the new fields:

```json
{
  "id": "setup_guide_...",
  "brand_id": "govee",
  "language": "en",
  "steps": [
    {
      "order": 1,
      "title": "Welcome to Govee Setup",
      "content": "This wizard will help you set up your Govee API access.",
      "step_type": "info",
      "requires_credentials": false,
      "allow_device_test": false,
      "credential_fields": []
    },
    {
      "order": 2,
      "title": "Enter API Key",
      "content": "Get your API key from the Govee Home app...",
      "step_type": "credentials",
      "requires_credentials": true,
      "allow_device_test": true,              // NEW
      "device_test_label": "Test Connection",  // NEW
      "device_test_help": "Optional: verify the API key works by checking connected devices",
      "credential_fields": [
        {
          "id": "api_key",
          "label": "Govee API Key",
          "type": "password",
          "help": "Get from Govee account settings",
          "placeholder": "..."
        }
      ],
      "allow_credential_test": false  // DEPRECATED: kept for backward compatibility
    },
    {
      "order": 3,
      "title": "All Set!",
      "content": "Your Govee integration is ready to use.",
      "step_type": "confirm",
      "requires_credentials": false,
      "allow_device_test": false,
      "credential_fields": []
    }
  ]
}
```

## Frontend Implementation Changes

### Button Visibility Logic (Simplified)

| Button | When to show | Notes |
|--------|------|-------|
| Back | Always (except step 1) | Allow user to go back |
| Next | Only if NOT last step AND (no credentials required OR credentials are already saved) | New logic: don't block on testing |
| Save | Only if `requires_credentials: true` | Same logic, unchanged |
| Test Connection | Only if `allow_device_test: true` | NEW: separate from step progression |

### State Machine Updates

```
Current:
  step_1 → step_2 (ask for credentials)
        → step_3 (test credentials - can FAIL and loop back)
        → step_4+ (progression after test passes)

New:
  step_1 → step_2 (ask for credentials)
        ├→ On Save: Validate credentials automatically
        │   ├→ Valid: Save to backend, enable Next button
        │   └→ Invalid: Show error, don't proceed
        ├→ Optional: Test Device Connection (async, no page change)
        └→ step_3+ (progression independent of device test)
```

### Key UX Improvements

1. **Faster flow:** Skip the redundant "test" step — validation happens on save
2. **Optional testing:** Users can check device connection if they want confidence
3. **Clearer intent:** Separate concerns (credential validation vs device connectivity)
4. **Flexible testing:** Can retry device test multiple times without re-saving credentials
5. **Async feedback:** Device test doesn't block wizard — other steps can be checked while waiting

## Migration Path (Backward Compatibility)

### If API doesn't support new fields yet:

**Frontend can adapt:**
1. Check if `allow_device_test` exists (new API)
2. If missing, hide the device test section
3. Still use `allow_credential_test` for backward compat
4. Gradually move to new fields as backend updates

### If backend needs time to implement:

**Phase 1 (Current):** Keep existing endpoints
- `POST /auth/brand/{brand_id}/test` — test credentials
- Credentials are tested before save

**Phase 2 (Proposed):** Add new endpoints
- Add `allow_device_test` to step response
- Add `POST /auth/brand/{brand_id}/test-device-connection`
- Credentials validated on save automatically

**Phase 3 (Optional):** Deprecate old flow
- Remove `allow_credential_test`
- Remove `POST /auth/brand/{brand_id}/test`
- Use only new device test endpoint

## Summary of API Changes

### Required Changes:
1. **Add to step response:**
   - `step_type: "credentials" | "info" | "confirm"`
   - `allow_device_test: boolean` (replaces `allow_credential_test`)
   - `device_test_label: string` (optional)
   - `device_test_help: string` (optional)

2. **Update save endpoint:**
   - Always validate credentials on save
   - Return validation result in response
   - Add optional `test_device_connection` parameter

3. **New device test endpoint (optional but recommended):**
   - `POST /auth/brand/{brand_id}/test-device-connection`
   - Separate from credential validation
   - Can be called multiple times without side effects

### Optional/Future:
- Keep `allow_credential_test` for backward compatibility
- Deprecate `POST /auth/brand/{brand_id}/test` when all clients updated
- Add more `step_type` values as needed (e.g., "oauth", "confirm", "review")

## Questions for Backend Team

1. **Credential validation on save:** Should this always happen, or only if `skip_validation: false`? (Recommend: always)
2. **Device test endpoint:** Should this be a new endpoint or reuse existing test endpoint?
3. **Async handling:** Should device test return immediately or should frontend handle async polling?
4. **Error recovery:** If credentials are invalid on save, should user stay on same step or go back?

---

## Benefits of This Design

✅ **Cleaner UX:** 3 logical steps instead of 4  
✅ **Faster setup:** No redundant testing step  
✅ **More flexible:** Optional device test doesn't block progression  
✅ **Clearer intent:** Credential validation vs connectivity testing  
✅ **Better error handling:** Inline validation feedback  
✅ **Backward compatible:** Can implement gradually  

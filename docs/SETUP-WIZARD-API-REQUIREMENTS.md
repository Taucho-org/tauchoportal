# Setup Wizard API Requirements — Backend Action Items

## High-Level Summary

The frontend is requesting **3 focused changes** to support a better UX where:
1. Credentials are validated **on save** (no separate test step)
2. Device connection check is **optional** (separate section, doesn't block progression)
3. Steps are **cleaner and faster** (fewer redundant interactions)

---

## Required Changes

### 1️⃣ Extend Step Response Structure

**File:** API endpoint that returns setup guide steps (likely: `GET /auth/brand/{brand_id}/setup-guide`)

**Add these fields to each step object:**

```json
{
  "order": 1,
  "title": "Enter API Key",
  "content": "...",
  
  // ===== NEW FIELDS =====
  "step_type": "credentials",  // Type of step: "info" | "credentials" | "confirm"
  "allow_device_test": true,   // NEW: Whether user can test device connection (optional)
  "device_test_label": "Test Connection",  // Optional: Button label (default: "Test Connection")
  "device_test_help": "Verify the API key works by checking connected devices",  // Optional: Help text
  
  // ===== EXISTING (keep these) =====
  "requires_credentials": true,
  "credential_fields": [...]
  
  // ===== DEPRECATED (still send for backward compat, but will be ignored) =====
  "allow_credential_test": false
}
```

**What this enables:**
- Frontend knows if device testing is available for this step
- Device test is clearly optional (separate from credential validation)
- Frontend can customize button labels per brand

**Backward compatibility:**
- Old clients will ignore the new fields
- `allow_credential_test: false` can still be sent (frontend will ignore it)

---

### 2️⃣ Update Save Credentials Endpoint

**Endpoint:** `POST /auth/brand/{brand_id}/save-credentials` (or similar)

**Current behavior:**
- Requires separate test call before save works
- User must test credentials before proceeding to next step

**New behavior:**
- **Always validate credentials on save** (no extra test call needed)
- **Returns validation result** in response
- Credentials must be valid before saving (same as before)
- Optional device connection test (separate, doesn't block save)

**Updated request body:**

```json
{
  "step_number": 1,
  "credentials": {
    "api_key": "...",
    "device_id": "..."  // Optional, depends on brand
  },
  "skip_validation": false,  // Optional; recommend: always validate (default: false)
  "test_device_connection": false  // NEW: Should we also test device connectivity?
}
```

**Updated response body (on success):**

```json
{
  "success": true,
  "message": "Credentials saved successfully",
  
  "validation": {
    "is_valid": true,
    "message": "✅ API key verified",
    "error": null,
    "suggestion": null
  },
  
  "device_test": null  // Null if test_device_connection was false
  // If test_device_connection was true:
  // {
  //   "is_connected": true,
  //   "device_count": 3,
  //   "devices": [...]
  // }
}
```

**Response on validation failure (HTTP 422):**

```json
{
  "success": false,
  
  "validation": {
    "is_valid": false,
    "error": "Invalid API key. Check your Govee account settings.",
    "suggestion": "Try regenerating a new API key from the Govee app"
  },
  
  "device_test": null  // Validation failed, so device test not attempted
}
```

**Key points:**
- Credentials MUST be validated on save (validation failure prevents saving)
- Device test is optional, separate, and non-blocking
- If device test is requested but validation fails, device test is skipped
- Return human-readable error and suggestion text

---

### 3️⃣ New Optional Endpoint: Device Connection Test

**Recommendation:** Add a separate endpoint for testing device connectivity (distinct from credential validation).

**Endpoint:** `POST /auth/brand/{brand_id}/test-device-connection`

**Why separate?**
- User can test device connection multiple times without re-saving credentials
- Doesn't block step progression
- Frontend can call async without waiting
- Testing is truly optional (user can skip)

**Request body:**

```json
{
  "credentials": {
    "api_key": "...",
    "device_id": "..."  // Brand-specific fields
  }
}
```

**Response (success):**

```json
{
  "is_connected": true,
  "message": "Connected successfully! Found 3 devices.",
  "device_count": 3,
  "devices": [
    {
      "id": "device_1",
      "name": "Living Room Light",
      "status": "online"
    },
    {
      "id": "device_2",
      "name": "Bedroom Light",
      "status": "offline"
    },
    {
      "id": "device_3",
      "name": "Kitchen Light",
      "status": "online"
    }
  ]
}
```

**Response (failure):**

```json
{
  "is_connected": false,
  "error": "Could not retrieve devices with these credentials",
  "suggestion": "Try a different API key or check if your account permissions changed"
}
```

**HTTP status:**
- `200 OK` with `is_connected: true/false` (even if device test fails, HTTP 200 is fine)
- `400 Bad Request` if credentials format is invalid
- `422 Unprocessable Entity` if credentials are syntactically valid but API rejects them

**Important:**
- This endpoint should **not** save credentials
- It should **not** update any database state
- It can be called multiple times without side effects
- It's purely informational (helps user verify setup before proceeding)

---

## Implementation Order (Recommended)

### Phase 1 (Quick Win)
1. Add the 4 new fields to step response (`step_type`, `allow_device_test`, `device_test_label`, `device_test_help`)
2. Always validate credentials on save in existing save endpoint
3. Update save response to include validation result

**Effort:** ~2-3 hours | **Frontend can use:** Immediately

### Phase 2 (Optional but Recommended)
4. Add new `POST /auth/brand/{brand_id}/test-device-connection` endpoint
5. Frontend can use for optional device testing

**Effort:** ~2-3 hours | **Frontend enhancement:** Better UX, parallel testing

### Phase 3 (Cleanup, Optional)
6. Deprecate old `allow_credential_test` field (kept in response for backward compat)
7. Deprecate old `POST /auth/brand/{brand_id}/test` endpoint (if it exists as separate endpoint)

**Effort:** ~1 hour | **Impact:** Cleaner API (no client code change needed)

---

## Example: Govee Brand Setup

### Current Flow (4 steps)
```
Step 1: Intro
  ↓
Step 2: Enter API Key
  - Shows credential input
  - User enters key
  - User clicks "Save"
  ↓
Step 3: Test Credentials
  - User waits for test
  - Test passes/fails
  - If fails, loops back to Step 2
  ↓
Step 4: Confirm (or done)
```

### New Flow (3 steps, faster)
```
Step 1: Intro
  ↓
Step 2: Enter API Key + Optional Device Test
  - Shows credential input
  - User enters key
  - User clicks "Save"
    └→ Backend validates credentials automatically
    └→ If invalid: shows error, stays on step
    └→ If valid: saves, enables "Next" button
  - Optionally: User clicks "Test Connection" (async, separate)
    └→ Shows list of devices (async, doesn't block)
  ↓
Step 3: Confirm (or done)
```

**Benefits:**
- ✅ One fewer step
- ✅ Credential validation always happens on save (no guesswork)
- ✅ Device test is truly optional (doesn't block progression)
- ✅ Can test multiple times without re-entering credentials

---

## Database/Schema Considerations

**No schema changes needed** — all these changes are at the API layer.

The `user_brand_credentials` table remains unchanged:
- Credentials are still saved via `POST /auth/brand/{brand_id}/save-credentials`
- The new fields (`allow_device_test`, etc.) come from the step definition, not from stored data

---

## Testing Checklist

After implementing changes, verify:

- [ ] Step response includes `step_type`, `allow_device_test` fields
- [ ] Credentials are validated on save, before DB insert
- [ ] Validation error prevents save (HTTP 422)
- [ ] Validation success enables next step
- [ ] Device test endpoint works independently (can call without saving)
- [ ] Device test endpoint returns device list on success
- [ ] Device test endpoint returns helpful error on failure
- [ ] All endpoints return human-readable error messages and suggestions
- [ ] Backward compatibility: old clients still work

---

## Frontend will do:

✅ Redesign dialog layout (credentials + optional test section)  
✅ Update button visibility logic  
✅ Call credential validation on save  
✅ Call device test async (non-blocking)  
✅ Display results inline  
✅ Reload page on successful final save  

---

## Questions / Clarifications Needed

- [ ] Does the existing save endpoint already validate credentials on save, or does it skip validation?
- [ ] Is there an existing test endpoint that can be extended, or should we create a new one?
- [ ] Should device test count toward rate limiting / API quotas?
- [ ] For multi-step setups (step 1 with credentials, step 2 without): should step 2 be skippable if credentials failed on step 1?


# Setup Wizard Endpoint Analysis
**Analysis Date:** 2026-08-23  
**Status:** Ready for implementation

---

## Summary

The frontend needs **3 focused API changes** for the setup wizard redesign. After analyzing existing code:

✅ **Endpoints we already have that can be reused/extended:**
- `POST /auth/brand/{id}/connect` — Credential save + validation
- `POST /auth/brand/{id}/test` — Device connection test
- `GET /brand/{id}/setup-guide` — Setup guide retrieval

❌ **Endpoints that need to be created:**
- None. All existing endpoints can serve the wizard requirements.

⚠️ **Endpoints that need modifications:**
- 2 endpoints (add response fields for validation details)
- 1 endpoint (add new step fields)

---

## Detailed Analysis

### 1️⃣ Setup Guide Step Response — Needs Extension

**Endpoint:** `GET /brand/{id}/setup-guide`  
**Status:** ✅ ALREADY EXISTS (can be extended)

**Current:**
```go
type BrandSetupGuideStep struct {
    Order                int               `json:"order"`
    Title                string            `json:"title"`
    Content              string            `json:"content"`
    RequiresCredentials  bool              `json:"requires_credentials"`
    AllowCredentialTest  bool              `json:"allow_credential_test"`  // ← OLD NAME
    CredentialFields     []CredentialField `json:"credential_fields,omitempty"`
}
```

**Documentation Requires:**
- `step_type` — NEW: "info" | "credentials" | "confirm"
- `allow_device_test` — NEW (replaces `allow_credential_test`)
- `device_test_label` — NEW (optional): Custom button label
- `device_test_help` — NEW (optional): Help text

**Action Required:**
1. Add 4 fields to `BrandSetupGuideStep` model in `internal/models/brand_setup_guide.go`
2. Update database schema to store these fields (likely already in brand_setup_guides table)
3. Update response building in `BrandSetupGuideHandlers.HandleGetSetupGuide()`

**Files to Modify:**
- `internal/models/brand_setup_guide.go` — Add fields to struct
- `internal/store/sql_brand_setup_guide_store.go` — Query the new fields from DB
- `internal/api/brand_setup_guide_handlers.go` — Response already uses model, no change needed

---

### 2️⃣ Credential Save Response — Needs Validation Details

**Endpoint:** `POST /auth/brand/{id}/connect`  
**Status:** ✅ ALREADY EXISTS (needs response modification)

**Current Behavior:**
- ✅ Validates credentials before saving
- ✅ Blocks save on validation failure (HTTP 422)
- ❌ Response doesn't include validation details
- ❌ Doesn't support optional device test in same call

**Current Response (Success):**
```json
{
  "id": "ubcred_...",
  "brand_id": "govee",
  "status": "connected",
  "connected_at": "2026-08-23T15:35:28Z"
}
```

**Documentation Requires:**
```json
{
  "success": true,
  "message": "Credentials saved and validated",
  
  "validation": {
    "is_valid": true,
    "message": "✅ API key verified successfully",
    "error": null,
    "suggestion": null
  },
  
  "device_test": null  // or device list if requested
}
```

**Action Required:**
1. Update `ConnectBrandRequest` to include optional `test_device_connection: bool` parameter
2. Update `ConnectBrandResponse` to include validation details + device test results
3. Modify `HandleConnectBrand()` to optionally fetch devices after validation succeeds

**Files to Modify:**
- `internal/models/brand_credentials.go` — Update request/response types
- `internal/api/brand_credentials_handlers.go` — Modify response building in `HandleConnectBrand()`

**Effort:** ~1 hour (straightforward response structure change)

---

### 3️⃣ Device Connection Test — CAN REUSE EXISTING ENDPOINT

**Endpoint:** `POST /auth/brand/{id}/test`  
**Status:** ✅ ALREADY EXISTS (perfect for "test-device-connection")

**Current Behavior:**
- ✅ Takes credentials (doesn't save them)
- ✅ Returns device list on success
- ✅ Returns error on failure
- ✅ Can be called multiple times
- ✅ HTTP 200 even if test fails

**Current Response:**
```json
{
  "is_valid": true,
  "message": "Connection successful",
  "device_count": 3,
  "devices": [
    { "id": "device_1", "name": "Light 1", "status": "online" }
  ]
}
```

**Documentation Wants:**
```json
{
  "is_connected": true,
  "message": "Connected successfully! Found 3 devices.",
  "device_count": 3,
  "devices": [
    { "id": "device_1", "name": "Light 1", "status": "online" }
  ]
}
```

**Action Required:**
- **Option A (Recommended):** Keep existing endpoint, frontend calls it as "test-device-connection"
- **Option B (Better API naming):** Rename/alias to `POST /auth/brand/{id}/test-device-connection`
- **Option C (Zero changes):** Do nothing — endpoint already works for this purpose

**Note:** The response field naming differs slightly (`is_valid` vs `is_connected`). Check if frontend expects exact names from documentation.

**Effort:** 
- Option A: 0 hours (no changes needed)
- Option B: 15 minutes (add route alias, minimal changes)
- Option C: 0 hours (frontend just calls existing endpoint)

---

## What Does NOT Need Creating

❌ `POST /auth/brand/{id}/save-credentials` — **NOT NEEDED**
- Frontend documentation lists this as a new endpoint
- But `POST /auth/brand/{id}/connect` already does this
- Rename `connect` to `save-credentials` OR just use existing endpoint

❌ `POST /auth/brand/{id}/test-device-connection` — **NOT NEEDED**
- `POST /auth/brand/{id}/test` already does this
- Just document/rename it if needed

---

## Implementation Roadmap

### Phase 1 (Required) — ~1-2 hours
1. ✅ Modify `GET /brand/{id}/setup-guide` response
   - Add `step_type`, `allow_device_test`, `device_test_label`, `device_test_help` to model
   - Update DB queries to fetch these fields
   - Backfill existing setup guides with sensible defaults

2. ✅ Modify `POST /auth/brand/{id}/connect` response
   - Update response structure to include validation details
   - Add optional `test_device_connection` parameter
   - Return device list if test requested and validation passes

### Phase 2 (Optional) — ~15 minutes
- Add route alias: `POST /auth/brand/{id}/test-device-connection` → calls existing test handler
- Update docs to use new endpoint name

### Phase 3 (Optional) — ~30 minutes
- Deprecate old field names (`allow_credential_test` → `allow_device_test`)
- Backfill existing guides

---

## Database Schema Status

✅ **Good news:** No schema changes needed for most fields
- `requires_credentials` already exists in `brand_setup_guides`
- `allow_credential_test` already exists (can be renamed or co-exist)

⚠️ **Needs checking:**
- Does `brand_setup_guides` table have columns for:
  - `step_type` (or can derive from order/context)?
  - `device_test_label`?
  - `device_test_help`?
  - `credential_fields` (already added in recent refactor)?

---

## Files to Modify Summary

| File | Changes | Complexity |
|------|---------|-----------|
| `internal/models/brand_setup_guide.go` | Add 4 fields to step struct | Low |
| `internal/models/brand_credentials.go` | Extend request/response types | Low |
| `internal/store/sql_brand_setup_guide_store.go` | Query new fields from DB | Medium |
| `internal/api/brand_setup_guide_handlers.go` | No change needed (uses model) | None |
| `internal/api/brand_credentials_handlers.go` | Update `HandleConnectBrand()` response | Medium |
| `internal/bootstrap/routes.go` | Optional: Add route alias | Low |

---

## What Frontend Should Do

✅ **Call these endpoints (they work as-is):**
- `GET /brand/{brand_id}/setup-guide?lang=en` — Get steps with new fields

✅ **Call this endpoint (modify expected response):**
- `POST /auth/brand/{brand_id}/connect` — Save credentials + get validation + optional device test

✅ **Call this endpoint (rename in your mind):**
- `POST /auth/brand/{brand_id}/test` — Can be called as "test-device-connection"

❌ **Do NOT expect these new endpoints (use existing ones):**
- `POST /auth/brand/{id}/save-credentials` — Use `/connect` instead
- `POST /auth/brand/{id}/test-device-connection` — Use `/test` instead

---

## Questions Before Implementation

1. Should `step_type` be stored in DB or derived from step order?
   - Info step (1st), credentials step (2nd), confirm step (3rd)?
   - Or explicit enum in `brand_setup_guides` table?

2. For `device_test_label` and `device_test_help`:
   - Store per-step in DB, or use brand-level defaults from `credential_fields`?
   - Can these be i18n (localized) or just English?

3. Response field naming for device test:
   - Keep `is_valid` (credential validation) or rename to `is_connected` (device connectivity)?
   - Documentation shows `is_connected` for device test results

4. Should existing deployments get migrated to new response format?
   - Backward compatibility: send both old + new field names?
   - Or breaking change: new format only?

---

## Conclusion

**Good news:** ✅ **All required functionality already exists in the codebase.**

No new endpoints need to be created. Just extend existing ones with:
- 4 new fields in setup guide step response
- Validation details in credential save response
- Optional device test call in same credential save request

**Total effort:** ~2-3 hours for Phase 1, including testing.

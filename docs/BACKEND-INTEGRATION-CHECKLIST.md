# Backend Integration Checklist

**Frontend Status:** ✅ Complete and ready  
**Date:** 2026-08-23

---

## What Frontend Implemented

✅ Device test section in setup wizard (optional, non-blocking)  
✅ Async device connection testing  
✅ UI for displaying test results  
✅ Support for new API response fields  
✅ Backward compatibility with old response format  

---

## What Backend Needs to Do

### Phase 1 (Required for Device Test Feature)

#### 1. Extend Setup Guide Step Response

**Endpoint:** `GET /brand/{id}/setup-guide`

**Add these 4 fields to each step object:**

```json
{
  "order": 1,
  "title": "Enter API Key",
  "content": "...",
  
  // ===== ADD THESE FIELDS =====
  "step_type": "info|credentials|confirm",
  "allow_device_test": true|false,
  "device_test_label": "Test Connection",
  "device_test_help": "Optional help text",
  
  // ===== KEEP EXISTING FIELDS =====
  "requires_credentials": true|false,
  "credential_fields": [...]
}
```

**Where to change:**
- File: `internal/models/brand_setup_guide.go` (or similar)
  - Add 4 fields to `BrandSetupGuideStep` struct
- File: `internal/store/sql_brand_setup_guide_store.go`
  - Update SQL query to fetch these fields from `brand_setup_guides` table
- File: Database migration
  - Add columns to `brand_setup_guides` table if not already present:
    - `step_type VARCHAR(50)` (nullable, default 'info')
    - `allow_device_test BOOLEAN` (nullable, default false)
    - `device_test_label VARCHAR(255)` (nullable)
    - `device_test_help TEXT` (nullable)

**Backward compatibility:**
- If fields missing in DB, return sensible defaults (nulls or false)
- Old clients will ignore these fields
- No breaking changes to existing clients

---

#### 2. No Changes Needed for Other Endpoints

**Good news:** These endpoints already work as-is:

✅ **POST /auth/brand/{id}/connect**
- Already validates credentials on save
- Already blocks save on validation failure
- Frontend works with existing response format
- **No changes needed**

✅ **POST /auth/brand/{id}/test**
- Already tests credentials without saving
- Already returns device list
- Frontend calls it for optional device test
- **No changes needed**

---

### Phase 2 (Optional but Recommended)

**Enhance response details** (if you want better feedback):

- Update `POST /auth/brand/{id}/connect` response to include validation details:
  ```json
  {
    "id": "ubcred_...",
    "validation": {
      "is_valid": true,
      "message": "✅ Credentials verified",
      "error": null,
      "suggestion": null
    }
  }
  ```

- This gives frontend more context for error messages
- Frontend currently works without this (backward compat)
- Can be added anytime without breaking existing clients

---

## Testing Checklist

**Before shipping:**

- [ ] `GET /brand/{id}/setup-guide` returns new fields
- [ ] New fields are included in response (even if empty/null)
- [ ] Old clients still work (new fields ignored)
- [ ] `POST /auth/brand/{id}/connect` still works
- [ ] `POST /auth/brand/{id}/test` still works
- [ ] Database has columns for new fields (or defaults provided)
- [ ] All brands return sensible defaults for new fields

**With frontend integration:**

- [ ] Frontend loads new setup guides
- [ ] Device test section appears on credential steps
- [ ] Device test button is clickable and functional
- [ ] Test results display correctly
- [ ] Error messages are helpful
- [ ] Page reloads after final save

---

## Database Schema Notes

**Assuming `brand_setup_guides` table structure:**

```sql
-- Add columns (if not already present):
ALTER TABLE brand_setup_guides ADD COLUMN step_type VARCHAR(50) DEFAULT 'info';
ALTER TABLE brand_setup_guides ADD COLUMN allow_device_test BOOLEAN DEFAULT false;
ALTER TABLE brand_setup_guides ADD COLUMN device_test_label VARCHAR(255);
ALTER TABLE brand_setup_guides ADD COLUMN device_test_help TEXT;

-- Example data:
UPDATE brand_setup_guides SET 
  step_type = 'credentials',
  allow_device_test = true,
  device_test_label = 'Test Connection',
  device_test_help = 'Verify the API key works by checking connected devices'
WHERE step_order = 2 AND brand_id = 'govee';
```

---

## Implementation Order

**Option A: Minimal (1-2 hours)**
1. Add 4 columns to `brand_setup_guides` table
2. Update model to include fields
3. Update SQL query to fetch fields
4. Done! Frontend automatically works

**Option B: Complete (2-3 hours)**
1. All of Option A
2. Plus: Backfill existing setup guides with default values
3. Plus: Enhance validation response details (Phase 2)
4. Plus: Write tests for new fields

---

## No Risks

✅ **Low risk changes:**
- Only adding new fields to existing response
- Old clients won't be affected
- No breaking changes to existing endpoints
- No new database tables needed
- No changes to authentication or security
- Purely additive enhancement

---

## Questions for Backend Team

1. Does `brand_setup_guides` table already have these columns?
2. Should `step_type` be derived from step order or explicit in DB?
3. Should device test help text be internationalized (i18n)?
4. Do you want to backfill existing setup guides or use DB defaults?

---

## Frontend Status

- ✅ Device test section renders
- ✅ Checkbox controls test button
- ✅ Test button calls existing `/test` endpoint
- ✅ Results display inline (success or error)
- ✅ CSS styled and responsive
- ✅ Backward compatible
- ✅ Ready for production

**Frontend is waiting on backend to add the 4 fields to setup guide response.**

---

## Success Criteria

✅ Setup guide includes new fields  
✅ Device test section appears on credential steps  
✅ Test button calls `/auth/brand/{id}/test`  
✅ Results display with device list or error  
✅ No errors in browser console  
✅ Page reloads after save  
✅ All existing functionality still works  

---

## Timeline

- **Today:** Frontend complete
- **Tomorrow:** Backend adds 4 fields to setup guide
- **Next day:** Integration testing
- **Later this week:** Ship to production

---

## Questions or Issues?

Refer to:
1. `/docs/SETUP-WIZARD-ENDPOINT-ANALYSIS.md` — What backend analyzed
2. `/docs/SETUP-WIZARD-API-REQUIREMENTS.md` — What frontend needs
3. `/SETUP-WIZARD-IMPLEMENTATION-COMPLETE.md` — What frontend built
4. This file — What backend needs to do


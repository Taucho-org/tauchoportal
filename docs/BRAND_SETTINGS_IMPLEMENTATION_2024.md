# Brand Settings Implementation - Setup Guides from Backend API

## Overview
Implemented proper separation of user-connected brands vs. all available catalog brands, with setup guides fetched from backend API instead of hardcoded.

## Key Changes

### 1. PageData Structure (cmd/main.go)
**Before:**
- Single `Brands` field containing user's connected brands only

**After:**
- `MyBrands []controller.MyConnectedBrand` - User's connected brands from `/auth/brands` API
- `Brands []controller.CatalogBrand` - All available brands from `/catalog/brands` API

This clear separation eliminates confusion between what the user owns vs. what's available.

### 2. Backend Data Fetching (cmd/main.go ~line 578-583)
```go
if cfg.Name == "brand-settings" {
    myBrandSettings := controller.MyBrandSettings{}
    data.MyBrands = myBrandSettings.ListMyBrands()
    
    brandList := controller.BrandList{}
    data.Brands = brandList.ListAll()
}
```

Now fetches both datasets:
- `MyBrands` from `MyBrandSettings.ListMyBrands()` 
- `Brands` from `BrandList.ListAll()`

### 3. Template Changes (templates/pages/brand-settings.html)
**Display Section:**
- Changed from `{{range .Brands}}` to `{{range .MyBrands}}`
- Only displays user's connected brands with their status

**Data Passing to JavaScript:**
```go
<script>
window._i18nMsg = {{i18nJSON .I18n}};
window._myBrands = {{jsonMarshal .MyBrands}};
window._allBrands = {{jsonMarshal .Brands}};
</script>
```

Passes both datasets:
- `window._myBrands` - User's connected brands (for reference)
- `window._allBrands` - All catalog brands (used to build BRANDS list)

### 4. JavaScript Implementation (public/js/brand-settings.js)

#### BRANDS List Construction
```javascript
const BRANDS = (window._allBrands || []).map(brand => ({
  id: brand.id,
  name: brand.name,
  authenticationType: brand.authentication_type || 'unknown',
  requiresToken: brand.requires_token !== false
}));
```
- Built from `window._allBrands` (all catalog brands)
- Extracts catalog metadata: id, name, authentication_type, requires_token

#### Setup Guides Caching
```javascript
const setupGuidesCache = new Map();
const pendingGuideFetches = new Map();
```
- Caches fetched guides to avoid duplicate API requests
- Tracks pending fetches to prevent race conditions

#### Setup Guide Fetching
```javascript
async function fetchSetupGuide(brandId) {
  // 1. Check cache
  // 2. Check pending requests
  // 3. Fetch from API: GET /api/brand/{id}/setup-guide?lang={lang}
  // 4. Cache result
  // 5. Handle errors gracefully
}
```

Features:
- Checks cache first (instant return if already fetched)
- Prevents duplicate parallel requests
- Fetches from backend API with language parameter
- Transforms API response to expected format
- Returns `null` on error instead of failing

#### Updated Action Handler
```javascript
async function handleBrandAction(brandId) {
  // 1. Try to fetch setup guide
  // 2. If available, show setup wizard
  // 3. Fallback to direct auth methods (OAuth, API key, Local)
}
```

Now async and tries setup guide first before falling back.

## Architecture Benefits

1. **Clear Data Separation**
   - MyBrands: User's personal data (what they own)
   - Brands: System-wide catalog (what's available)
   - Eliminates confusion about brand list sources

2. **API-Driven Setup Guides**
   - No hardcoded guides in frontend
   - Backend can update guides without redeploying frontend
   - Supports i18n with language parameter
   - Guides can be updated in database independently

3. **Efficient Caching**
   - Guides cached per session
   - No duplicate API requests for same brand
   - Pending request deduplication

4. **Graceful Fallback**
   - If setup guide API returns null/error, falls back to direct auth methods
   - User experience not broken if guide fetching fails
   - All existing auth flows still work

## Backend API Contract

### GET /api/brand/{id}/setup-guide?lang={language_code}
Expected response format:
```json
{
  "steps": [
    {
      "title": "Step title",
      "content": "Step description"
    },
    ...
  ],
  "help_fields": {
    "api_key": "Help text for this field",
    "device_ip": "Help text for this field",
    ...
  }
}
```

### Notes
- Language parameter optional, defaults to 'en'
- Returns null if guide not found for language (frontend will show error)
- Backend should implement language fallback (if lang not found, return 'en')
- help_fields object is optional

## Build Status
✅ Project builds successfully with all changes
✅ No compilation errors
✅ All template variables properly wired

## Next Steps (Backend Team)
1. ✅ Verify `/auth/brands` API includes `auth_type` and `requires_token` fields
2. ✅ Verify `/catalog/brands?active_only=true` API working and returns proper structure
3. ⏳ Implement `/api/brand/{id}/setup-guide?lang={lang}` endpoint
4. ⏳ Populate brand_setup_guides table from docs/brand_setup_guides_insert.sql
5. ⏳ Add translations for other languages (fr, es, de, ja, ko, zh)

## Files Modified
- `cmd/main.go` - Updated PageData struct and data loading
- `templates/pages/brand-settings.html` - Template using MyBrands, script passing correct datasets
- `public/js/brand-settings.js` - Complete rewrite for API-driven setup guides
- `internal/controller/brand_settings.go` - Already has proper MyBrandSettings, BrandList, MyConnectedBrand, CatalogBrand classes

## Files Created
- `docs/brand_setup_guides_insert.sql` - Database schema and English guides for all brands

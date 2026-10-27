# Brand Controller Refactoring - Clear Separation of Concerns

## Summary
Reorganized the brand controller classes to clearly distinguish between:
1. **User's connected brands** (from `/auth/brands` - what the user has configured)
2. **Available brands catalog** (from `/catalog/brands` - all brands the system supports)

## Changes Made

### File: `internal/controller/brand_settings.go`

#### Before (Confusing naming)
```go
type BrandSettings struct{}        // Was this user's brands or all brands?
type ConnectedBrand struct{}       // Confusing terminology
type BrandsListResponse struct{}   // Not clear which endpoint

func (BrandSettings) ListBrands() []ConnectedBrand
```

#### After (Clear naming)
```go
// User's configured brands from /auth/brands
type MyBrandSettings struct{}
type MyConnectedBrand struct {
    ID               string
    Name             string
    IsConnected      bool
    AuthType         *string
    RequiresToken    *bool              // ← NEW: Added from backend API
    Status           *string
    ConnectedAt      *string
    // ... other fields
}
type MyBrandsListResponse struct{}

func (MyBrandSettings) ListMyBrands() []MyConnectedBrand
func (MyBrandSettings) GetMyBrandDetails(brandID string) MyConnectedBrand

// All available brands from /catalog/brands
type BrandList struct{}
type CatalogBrand struct {
    ID                      string
    Name                    string
    AuthType                *string              // ← From backend
    RequiresToken           *bool                // ← From backend  
    RequiresBrandCredentials bool
    CredentialFields        []BrandCredentialField
    Website                 *string
    LogoURL                 *string
    Icon                    *string
    DocsURL                 *string
    // ... other fields
}

func (BrandList) ListAll() []CatalogBrand
func (BrandList) Get(brandID string) CatalogBrand
```

### File: `cmd/main.go` (line ~577)

**Before:**
```go
brandSettings := controller.BrandSettings{}
data.Brands = brandSettings.ListBrands()  // Type: []controller.ConnectedBrand
```

**After:**
```go
myBrandSettings := controller.MyBrandSettings{}
data.Brands = myBrandSettings.ListMyBrands()  // Type: []controller.MyConnectedBrand
```

### File: `templates/pages/brand-settings.html` (scripts section)

**Added:**
```html
<script>
window._i18nMsg = {{i18nJSON .I18n}};
window._brandMetadata = {{jsonMarshal .Brands}};  // ← NEW: Pass brand metadata to JavaScript
</script>
```

### File: `public/js/brand-settings.js` (initialization)

**Before:**
```javascript
const BRANDS = [
  { id: 'govee', label: 'GV', authType: 'api-key' },
  { id: 'philips-hue', label: 'HU', authType: 'local', requiresToken: true },
  // ... 8 more hardcoded entries
];
```

**After:**
```javascript
const BRANDS = (window._brandMetadata || []).map(brand => ({
  id: brand.id,
  authenticationType: brand.authentication_type || 'unknown',
  requiresToken: brand.requires_token !== false
}));
```

## Benefits

1. **Clear Naming**: No ambiguity about which API/data source each class represents
2. **Dynamic Metadata**: Brand auth type and `requiresToken` now come from backend, not hardcoded
3. **Scalability**: Adding new brands doesn't require JavaScript changes
4. **Type Safety**: Clear types for each data structure
5. **Future-proof**: Setup guides can be loaded from new API endpoint as designed

## API Contract

### `/auth/brands` (User's Connected Brands)
Returns `MyConnectedBrand[]`:
- User-specific connection status
- Timestamps of last connection/test
- Error messages
- OAuth scope info

### `/catalog/brands?active_only=true` (All Available Brands)
Returns `CatalogBrand[]`:
- Brand metadata
- `requires_token` field (NEW - for local auth types)
- `credential_fields` (field definitions for forms)
- Authentication type

## Backward Compatibility

- Old `BrandSettings` type is completely replaced; check any other files using it
- The `Brands` field in `PageData` now uses `MyConnectedBrand` instead of `ConnectedBrand`
- Template rendering unchanged (same fields available)

## Setup Guides Implementation (Future)

When backend provides `/api/brand/{id}/setup-guide?lang=en`:
1. Change `SETUP_GUIDES` from hardcoded to API call
2. Add to `openSetupWizard()`:
   ```javascript
   const guide = await apiRequest('GET', `/brand/${brandId}/setup-guide?lang=en`);
   ```
3. Cache response in `Map(brandId, guideData)` for session persistence

## Naming Convention Going Forward

For similar cases in future:
- My* = User's personal/configured data (from /auth/* endpoints)
- Catalog* = System-wide catalog data (from /catalog/* endpoints)
- ❌ Avoid ambiguous names like "Brand", "BrandSettings", "BrandList" without qualifier

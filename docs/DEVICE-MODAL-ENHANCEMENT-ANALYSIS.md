# Device Modal Enhancement Analysis

## Current State

### What Exists:
1. **Device Modal** (`templates/pages/devices.html`)
   - Step 1: Brand & Product Selection (only for add, not edit)
   - Step 2: Device Configuration
     - Display Name (text input)
     - Product Model (read-only for catalog devices)
     - Room (optional, text input)
     - Credential Fields (password/text inputs based on `brand.credential_fields`)

2. **Credential Handling**
   - Credentials are rendered from `brand.credential_fields` array
   - Currently only displays `id`, `label`, `type`, `help`
   - When editing, credentials are populated from `dev.credentials` map
   - Passwords are masked with show/hide toggle

3. **Device Data Structure** (`internal/controller/devices.go`)
   ```go
   type Device struct {
       Id            string            `json:"id"`
       UserId        int               `json:"user_id"`
       Name          string            `json:"name"`
       Brand         string            `json:"brand"`
       ProductId     string            `json:"product_id"`
       ProductName   string            `json:"product_name"`
       Room          string            `json:"room"`
       IsConfigured  bool              `json:"is_configured"`
       Status        string            `json:"status"`
       Credentials   map[string]string `json:"credentials"`
       DeviceGroupId string            `json:"device_group_id"`
       SupportedActions []string       `json:"supported_actions"`
       CreatedAt     string            `json:"created_at"`
       UpdatedAt     string            `json:"updated_at"`
   }
   ```

### Current Problem:
1. **No device settings storage**: There's no place to store device-specific configuration (like MAC address, IP address, device_id that were discussed in brand-settings)
2. **Limited credential display**: Only shows raw password/text inputs, no context about what credentials mean for device operation
3. **No device identifier fields**: Unlike the setup wizard which now has device identification testing, the regular device modal doesn't have device identifier fields
4. **No settings section**: Unlike brand-settings.html which has credential fields + device testing + optional settings, devices modal only has credentials

---

## What User Wants

### Requirements:
1. **Show registered credentials** when editing a device (PARTIALLY works, but could be clearer)
2. **Show device settings based on brand requirements** (NOT IMPLEMENTED)
3. **Support device identifiers** like MAC address, IP, device_id (NOT IMPLEMENTED)
4. **Support optional device settings/info** that brands might require (NOT IMPLEMENTED)

### Example Use Cases:
- **Govee Device**: Need to show/edit device_id, mac_address (already in credentials), SKU
- **LIFX Device**: Need to show/edit mac_address
- **Tuya Device**: Need to show/edit device_id, ip_address
- **Custom Device**: Need to show device type, HTTP endpoints for actions (already works)

---

## API Changes Needed

### 1. Backend Device Model Enhancement

**Option A: Add `DeviceSettings` field (Recommended)**

```go
type Device struct {
    Id            string            `json:"id"`
    UserId        int               `json:"user_id"`
    Name          string            `json:"name"`
    Brand         string            `json:"brand"`
    ProductId     string            `json:"product_id"`
    ProductName   string            `json:"product_name"`
    Room          string            `json:"room"`
    IsConfigured  bool              `json:"is_configured"`
    Status        string            `json:"status"`
    
    // NEW: Separate credentials from settings
    Credentials   map[string]string `json:"credentials"`        // API keys, auth tokens
    DeviceSettings map[string]string `json:"device_settings"`   // MAC, IP, device_id, etc.
    
    DeviceGroupId string            `json:"device_group_id"`
    SupportedActions []string       `json:"supported_actions"`
    CreatedAt     string            `json:"created_at"`
    UpdatedAt     string            `json:"updated_at"`
}
```

**Why separate credentials from settings?**
- Credentials are for brand authentication (API keys, tokens) - sensitive
- Device settings are device identifiers/info (MAC, IP, device_id) - less sensitive but device-specific
- Different UI treatment: credentials are passwords, settings are identifiers
- Different storage/security: credentials might need encryption, settings are just lookups

---

### 2. Brand Metadata Enhancement (GET `/catalog/brands`)

**New Fields Needed in Brand Response:**

```json
{
  "id": "govee",
  "name": "Govee",
  "credential_fields": [
    {
      "id": "api_key",
      "label": "Govee API Key",
      "type": "password",
      "help": "Get from Govee account settings",
      "required": true
    }
  ],
  
  "device_settings_fields": [
    {
      "id": "device_id",
      "label": "Device ID",
      "type": "text",
      "placeholder": "e.g., 1a2b3c4d5e6f",
      "help": "The unique device identifier from the Govee app",
      "required": true
    },
    {
      "id": "mac_address",
      "label": "MAC Address",
      "type": "text",
      "placeholder": "aa:bb:cc:dd:ee:ff",
      "help": "The MAC address of your device",
      "required": false
    },
    {
      "id": "sku",
      "label": "Product SKU",
      "type": "text",
      "placeholder": "H6159",
      "help": "Product SKU (optional for advanced users)",
      "required": false
    }
  ]
}
```

**Key Additions:**
- `device_settings_fields`: Array of device-specific settings (identifiers, addresses, etc.)
- Each field has: `id`, `label`, `type`, `placeholder`, `help`, `required`
- Separate from `credential_fields` to allow different UI treatment
- Similar structure to credential_fields for consistency

---

### 3. Device CRUD Endpoints Enhancement

**POST `/devices` (Create) - Already exists**
```json
{
  "name": "Living Room Light",
  "brand": "govee",
  "product_id": "product_123",
  "room": "Living Room",
  "credentials": {
    "api_key": "abc123..."
  },
  "device_settings": {
    "device_id": "1a2b3c4d5e6f",
    "mac_address": "aa:bb:cc:dd:ee:ff",
    "sku": "H6159"
  }
}
```

**PATCH `/devices/update?id={id}` (Update) - Already exists**
- Same body as POST, but for updating

**GET `/devices?id={id}` (Get Single Device) - May need to add**
- Return full device including device_settings
- Currently devices are loaded in bulk from pre-loaded template data
- For editing, we use pre-loaded MY_DEVICES array
- Might want single-device endpoint for refresh/validation

---

### 4. New Optional Endpoints (For Enhanced UX)

**GET `/auth/brand/{id}/device-settings-info` (Get device settings template)**
- Purpose: Get the device_settings_fields for a brand without full catalog response
- Response:
  ```json
  {
    "brand_id": "govee",
    "device_settings_fields": [...]
  }
  ```
- Alternative: Just read from `window._allBrands` if already loaded (no API call needed)

---

## Frontend Changes Needed

### 1. Update Brand Modal to Include Device Settings Section

**Current Structure:**
```
Step 2 Form:
  ├─ Display Name
  ├─ Product Model (read-only)
  ├─ Room
  ├─ Credential Fields Section
  └─ Custom Actions Section (custom devices only)
```

**New Structure:**
```
Step 2 Form:
  ├─ Display Name
  ├─ Product Model (read-only)
  ├─ Room
  ├─ API Credentials Section
  │  ├─ Label: "API Credentials"
  │  └─ Credential fields (password/text)
  ├─ Device Settings Section (NEW)
  │  ├─ Label: "Device Information"
  │  ├─ Subtitle: "Identify your device in the brand app"
  │  └─ Device settings fields (text inputs)
  └─ Custom Actions Section (custom devices only)
```

### 2. JavaScript Changes Needed

**Add new function to render device settings:**
```javascript
function renderDeviceSettingsFields(brandId) {
    const brand = BRANDS.find(b => b.id === brandId);
    if (!brand || !brand.device_settings_fields) {
        document.getElementById('deviceSettingsFieldset').style.display = 'none';
        return;
    }
    
    document.getElementById('deviceSettingsFieldset').style.display = 'block';
    document.getElementById('deviceSettingsFields').innerHTML = 
        brand.device_settings_fields.map(f => {
            return `
            <div class="form-group">
                <label for="devset_${f.id}">
                    ${f.label}
                    ${f.required ? '' : '<span class="optional-label">(Optional)</span>'}
                </label>
                <input type="text" id="devset_${f.id}" 
                       placeholder="${f.placeholder || ''}"
                       ${f.required ? 'required' : ''}>
                <small class="form-help">${f.help}</small>
            </div>`;
        }).join('');
}
```

**Update `selectProduct()` to show device settings when editing:**
```javascript
// After renderCredFields(brandId), also call:
renderDeviceSettingsFields(brandId);
```

**Update `openEditModal()` to populate device settings:**
```javascript
// After filling credentials, also fill device settings:
const devSettings = dev.device_settings || {};
const brand = BRANDS.find(b => b.id === dev.brand);
if (brand && brand.device_settings_fields) {
    brand.device_settings_fields.forEach(f => {
        const el = document.getElementById('devset_' + f.id);
        if (el) el.value = devSettings[f.id] || '';
    });
}
```

**Update `saveDevice()` to include device settings:**
```javascript
// Collect device settings values
const devSettings = {};
const brand = BRANDS.find(b => b.id === selectedBrand);
if (brand && brand.device_settings_fields) {
    brand.device_settings_fields.forEach(f => {
        const el = document.getElementById('devset_' + f.id);
        if (el && el.value) devSettings[f.id] = el.value;
    });
}

// Include in request
const deviceBody = {
    name: name,
    brand: selectedBrand,
    product_id: document.getElementById('devProduct').value,
    room: room,
    credentials: creds,
    device_settings: devSettings  // NEW
};
```

---

## HTML Changes Needed

**In `templates/pages/devices.html` (Step 2 Form):**

Add new fieldset after credential fields:

```html
<!-- API Credentials -->
<fieldset class="form-section" id="credFieldset">
    <legend>{{.I18n.T "devices.apiCredentials"}}</legend>
    <div id="credFields"></div>
    <div id="credDocsLink"></div>
</fieldset>

<!-- Device Settings/Information (NEW) -->
<fieldset class="form-section" id="deviceSettingsFieldset" style="display:none">
    <legend>{{.I18n.T "devices.deviceSettings"}}</legend>
    <p style="font-size:0.9rem; color:#666; margin-bottom:1rem">
        {{.I18n.T "devices.deviceSettingsHelp"}}
    </p>
    <div id="deviceSettingsFields"></div>
</fieldset>

<!-- Custom Actions (existing) -->
<fieldset class="form-section" id="customActionsFieldset" style="display:none">
    <!-- ... existing custom actions code ... -->
</fieldset>
```

---

## Translation Keys Needed

```javascript
{
    "devices.apiCredentials": "API Credentials",
    "devices.deviceSettings": "Device Information",
    "devices.deviceSettingsHelp": "Enter device identifiers so the system can locate your specific device",
    "devices.optional": "(Optional)"
}
```

---

## Implementation Strategy

### Phase 1: Backend Changes (Backend Team)
1. Update Device struct to include `DeviceSettings map[string]string` field
2. Update CreateDeviceRequest/UpdateDeviceRequest to include `DeviceSettings`
3. Update database schema to store device_settings (probably as JSON)
4. Update GET `/catalog/brands` endpoint to include `device_settings_fields`
5. Update all device CRUD endpoints to handle device_settings

### Phase 2: Frontend Changes (Current Task)
1. Update `templates/pages/devices.html` to add device settings fieldset
2. Add new functions: `renderDeviceSettingsFields()`, update `selectProduct()`, `openEditModal()`, `saveDevice()`
3. Add translation keys for device settings UI
4. Test with mock brand data that includes device_settings_fields
5. Verify credentials and device settings are shown/saved correctly

### Phase 3: Testing & Polish
1. Test editing existing devices - verify device_settings are loaded and saved
2. Test creating new devices - verify device_settings are saved
3. Test with multiple brands - some with device_settings, some without
4. Test with optional device settings fields
5. Test required validation for device_settings fields

---

## Migration Path (If Needed)

**Question: What about existing devices without device_settings?**

Answer: 
- Existing devices will have empty `device_settings`
- When opening modal to edit, empty settings will show as blank fields
- User can optionally fill them in
- When saving, only non-empty settings are stored
- No data loss for existing credentials

---

## Summary of API Needs

| Change | Type | Priority | Impact |
|--------|------|----------|--------|
| Add `device_settings_fields` to brand metadata | Backend | High | Frontend can read brand requirements |
| Add `device_settings` to Device struct | Backend | High | Frontend can store/retrieve device settings |
| Update device CRUD endpoints | Backend | High | Device settings can be saved/loaded |
| Add `device_settings` field to request/response DTOs | Backend | High | API contract completeness |
| Optional: GET `/devices?id={id}` endpoint | Backend | Low | For single device refresh (currently using pre-loaded) |

---

## No New Endpoints Strictly Required

The existing endpoints can be enhanced with new fields:
- POST `/devices` + `device_settings` field
- PATCH `/devices/update?id={id}` + `device_settings` field
- GET `/catalog/brands` + `device_settings_fields` array per brand

No breaking changes needed - just field additions.


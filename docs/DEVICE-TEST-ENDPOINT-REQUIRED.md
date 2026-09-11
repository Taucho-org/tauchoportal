# Device-Specific Test Endpoint Required

## Current Situation

### Existing Endpoint (General Device Test)
- **POST `/auth/brand/{id}/test`** — Tests credentials, returns all connected devices
- Returns list: `{ devices: [ { id, name, status }, ... ] }`
- User can see "your key connects to 5 devices"
- ❌ Cannot test if a specific device is reachable

### New Requirement
- Test a **specific device** using brand-specific identifier (MAC address, IP, device ID, etc.)
- Identifier type is **fixed per brand** — not user-selectable
- Verify the user-entered device info matches something the key can reach
- Return detailed status of that one device

---

## Brand-Specific Device Identification

Each brand specifies how devices should be identified via `device_identification_required` in:
- **GET `/catalog/brands`** response
- **GET `/catalog/brands/get?id={id}`** response

### Example: Brands Response Structure

```json
[
  {
    "id": "govee",
    "name": "Govee",
    "device_identification_required": [
      {
        "type": "device_id",
        "label": "Device ID",
        "description": "The unique device identifier from the Govee app",
        "placeholder": "1a2b3c4d5e6f",
        "required": true
      }
    ]
  },
  {
    "id": "lifx",
    "name": "LIFX",
    "device_identification_required": [
      {
        "type": "mac_address",
        "label": "MAC Address",
        "description": "The MAC address of the LIFX device on your network",
        "placeholder": "aa:bb:cc:dd:ee:ff",
        "required": true
      }
    ]
  }
]
```

**Key points:**
- ✅ Each brand has ONE primary device identifier type
- ✅ Frontend retrieves from `window._allBrands` (already loaded)
- ✅ No dropdown needed — identifier type is predetermined
- ✅ Frontend uses the brand-specified type when calling test endpoint

---

## Frontend Implementation

### UI/UX Flow for Device Test Section (Multiple Parameters)

```
┌─────────────────────────────────────────────────┐
│  Device Connection Test (Optional)              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ☐ Test specific device connectivity            │
│                                                 │
│  Device ID:                                     │
│  [ Enter device ID here...]                     │
│  The unique device identifier from Govee app   │
│                                                 │
│  MAC Address:                                   │
│  [ Enter MAC address here...]                   │
│  The MAC address of your device                │
│                                                 │
│  SKU:                                           │
│  [ Enter SKU here...]                           │
│  Product SKU (optional)                         │
│                                                 │
│  [ Test Device Connection Button ]              │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Results:                                       │
│  ✅ Device found: Light - Living Room           │
│     Status: Online                              │
│     Device ID: 1a2b3c4d5e6f                     │
│  ─────────────────────────────────────────────  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Code Changes (Frontend)

**File:** `public/js/brand-settings.js`

**Function:** `renderDeviceTestSection(step, container)` — UPDATED

Changes:
1. ✅ Iterate through ALL `device_identification_required` items (foreach)
2. ✅ Create multiple input fields (one for each identifier type)
3. ✅ Store each input reference by identifier type
4. ✅ Show label, placeholder, and description for each field
5. ✅ Build object with all device identifiers: `{ device_id: "...", mac_address: "...", sku: "..." }`

**Function:** `testSpecificDevice(step, deviceInfo)` — UPDATED

Changes:
1. ✅ Changed signature: `(step, deviceInfo)` instead of `(step, identifierType, identifierValue)`
2. ✅ `deviceInfo` is now an object with multiple key-value pairs
3. ✅ Validate that at least one identifier has a value
4. ✅ Pass all identifiers to API: `device_info: { device_id: "...", mac_address: "...", sku: "..." }`

**Example:**
```javascript
// Single identifier (simple brands like LIFX)
{
  mac_address: "aa:bb:cc:dd:ee:ff"
}

// Multiple identifiers (complex brands like Govee)
{
  device_id: "1a2b3c4d5e6f",
  mac_address: "aa:bb:cc:dd:ee:ff",
  sku: "H6159"
}
```

---

## Proposed New Endpoint

### POST `/auth/brand/{id}/test-device`

**Purpose:** Test connectivity to a specific device using saved credentials.

**Request Body:**
```json
{
  "credentials": {
    "api_key": "...",
    "other_field": "..."  // varies by brand
  },
  "device_info": {
    "identifier_type": "device_id",  // PREDETERMINED by brand (not user-selected)
    "identifier_value": "1a2b3c4d5e6f"  // user-entered value
  }
}
```

**Success Response (HTTP 200):**
```json
{
  "is_found": true,
  "is_reachable": true,
  "device_id": "1a2b3c4d5e6f",
  "device_name": "Light - Living Room",
  "device_type": "smart_light",
  "status": "online",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "ip_address": "192.168.1.100",
  "last_seen": "2026-08-23T17:00:00Z",
  "signal_strength": -45,
  "message": "Device found and reachable"
}
```

**Failure - Device Not Found (HTTP 200):**
```json
{
  "is_found": false,
  "is_reachable": false,
  "device_id": null,
  "message": "Device not found in account",
  "suggestion": "Check if the device ID is correct or if it's connected to the same account"
}
```

**Failure - Invalid Credentials (HTTP 422 or 401):**
```json
{
  "error": "Invalid API key",
  "message": "Credentials are not valid for this brand"
}
```

---

## Backend Implementation Checklist

### Phase 1: Create Endpoint
- [ ] Create `POST /auth/brand/{id}/test-device` handler
- [ ] Accept credentials + device identifier (predetermined type + user value)
- [ ] Validate credentials first
- [ ] Query brand's API for specific device
- [ ] Return device details or not-found error

### Phase 2: Implement Per-Brand Logic
For each brand supported (Govee, Philips Hue, LIFX, TP-Link Kasa, etc.):
- [ ] Read the `device_identification_required` type from brand config
- [ ] Map it to the correct API parameter for that brand
  - Govee: search by `deviceId`
  - LIFX: search by `mac_address`
  - Tuya: search by `device_id`
  - TP-Link Kasa: search by `mac` or `host`
- [ ] Implement device lookup logic
- [ ] Handle brand-specific error responses
- [ ] Extract relevant device info to return

### Phase 3: Response Mapping
Normalize brand responses to common format:
```go
type TestDeviceResponse struct {
  IsFound      bool   `json:"is_found"`
  IsReachable  bool   `json:"is_reachable"`
  DeviceID     string `json:"device_id"`
  DeviceName   string `json:"device_name"`
  DeviceType   string `json:"device_type"`
  Status       string `json:"status"`  // "online", "offline", "unknown"
  MacAddress   string `json:"mac_address,omitempty"`
  IPAddress    string `json:"ip_address,omitempty"`
  LastSeen     string `json:"last_seen,omitempty"`
  SignalStrength int  `json:"signal_strength,omitempty"` // dBm
  Message      string `json:"message"`
  Suggestion   string `json:"suggestion,omitempty"`
}
```

### Phase 4: Error Handling
- [ ] Handle missing/invalid credentials
- [ ] Handle device not found
- [ ] Handle network errors
- [ ] Handle brand API rate limits
- [ ] Return helpful suggestions in error messages

---

## Files to Modify (Backend)

| File | Changes | Priority |
|------|---------|----------|
| `internal/models/device.go` | Add `TestDeviceResponse` type | HIGH |
| `internal/api/device_handlers.go` | Create `HandleTestDevice()` handler | HIGH |
| `internal/bootstrap/routes.go` | Add route: `POST /auth/brand/:id/test-device` | HIGH |
| `internal/service/govee_service.go` | Implement `TestDevice()` for Govee | MEDIUM |
| `internal/service/lifx_service.go` | Implement `TestDevice()` for LIFX | MEDIUM |
| (other brand services) | Same pattern for other brands | MEDIUM |

---

## Key Differences from Previous Design

| Aspect | Previous | Current |
|--------|----------|---------|
| Identifier Type | User-selectable dropdown | Brand-predetermined (hidden) |
| UI Complexity | Multiple dropdowns + input | Single input field |
| Frontend Logic | Choose from multiple types | Use brand-specified type |
| API Call | User selects type | Type is predetermined |
| Brand Consistency | Same UI for all brands | Tailored to each brand's needs |
| Flexibility | Generic, supports many types | Specific to brand requirements |

---

## Summary

**Frontend Changes:**
- ✅ Remove identifier type dropdown
- ✅ Read brand metadata from `window._allBrands`
- ✅ Use brand-specified device identifier type
- ✅ Show single input field with brand-specific label/placeholder/description
- ✅ Seamless UX (no user confusion about which identifier to use)

**Backend Needs To:**
1. Create `POST /auth/brand/{id}/test-device` endpoint
2. Accept credentials + device identifier (type + value)
3. Use brand-specified identifier type to query brand API
4. Return device details or not-found error
5. No new `device_test_config` needed (use existing `device_identification_required`)

**Effort estimate:** 4-6 hours
- 1 hour: Create endpoint + response model
- 2-3 hours: Implement per-brand logic (Govee, LIFX, Kasa, Tuya, etc.)
- 1-2 hours: Error handling + testing

---

## Questions for Backend Team

1. Which brands should support device testing first?
2. For each brand, how does its API handle device lookup?
   - Govee: by `deviceId`?
   - LIFX: by `mac_address` or other?
   - TP-Link Kasa: by `mac` or `host`?
   - Tuya: by `device_id`?
3. Should we cache device lookup results? For how long?
4. Should there be rate limiting per brand?
5. Should we return all device details or just essential info?

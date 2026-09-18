# Unicorn Brand Implementation Guide

**Date:** September 9, 2026  
**Status:** ✅ Complete & Ready for Testing  
**Brand:** Unicorn Extermination Section (Unicorn)  
**Website:** https://unicornextermination.info  
**API Base URL:** https://api.unicornextermination.info

---

## 📋 Summary

Unicorn (Unicorn Extermination Section) has been fully integrated into the TauchoAPIs smart device platform following the same pattern as Govee. The implementation includes:

- **Device Control:** Full support for Penlight Waver devices
- **Authentication:** Email/password with JWT token validation
- **API Integration:** Complete credential validation against Unicorn API
- **Commands:** Light control, motor control, RGB color, and wave effects

---

## 🔧 Implementation Details

### 1. Core Files Created/Modified

#### **A. New File: `internal/device/unicorn.go`**
Implements the Unicorn device executor and command builder.

**Key Components:**
- `UnicornExecutor` struct: Handles device command execution
- `BuildUnicornCommand()`: Validates and normalizes commands
- `ValidateUnicornColor()`: Validates color parameters (red, green, blue, white, yellow, cyan, purple)
- `ValidateUnicornCredential()`: Checks credential format

**Supported Commands:**
- `light_on` / `light_off`: Control light
- `motor_run` / `motor_stop`: Control motor
- `rgb` / `color`: Set RGB color
- `wave` / `wave_timed`: Start timed wave with parameters
- `wave_stop`: Stop wave immediately

**Parameter Validation:**
- Color: Limited set (red, green, blue, white, yellow, cyan, purple)
- Brightness: 0-255
- Motor Speed: 1-100
- Duration: 0-3600 seconds

#### **B. Updated File: `internal/device/credential_validator.go`**
Added Unicorn-specific credential validation.

**New Method: `ValidateUnicorn()`**
- Authenticates with Unicorn API using email/password
- Retrieves JWT token
- Fetches device list
- Optionally verifies specific device_id
- Returns device count and details

**Flow:**
1. POST to `/auth/login` with email/password
2. Receive JWT token
3. GET `/devices/mine` with token
4. Parse devices and return status

#### **C. Updated File: `internal/models/device.go`**
Added "unicorn" to ValidBrands list for validation.

**Before:**
```go
var ValidBrands = []string{
    "govee", "hue", "kasa", "lifx",
    "nanoleaf", "yeelight", "wled", "wyze", "amazon", "custom",
}
```

**After:**
```go
var ValidBrands = []string{
    "govee", "hue", "kasa", "lifx",
    "nanoleaf", "yeelight", "wled", "wyze", "amazon", "unicorn", "custom",
}
```

#### **D. Updated File: `internal/device/credential_validator.go`**
Added `ValidateUnicorn` to CredentialValidator interface.

### 2. Database Setup

**File:** `docs/unicorn_products_insert.sql`

Includes:
- Brand entry with metadata (logo, icon, docs link)
- Product entry for Penlight Waver device
- Credential fields configuration for frontend form rendering
- Device identification requirements

**Credential Fields:**
```json
[
  {
    "id": "email",
    "label": "Email",
    "type": "text",
    "help": "Your Unicorn account email address"
  },
  {
    "id": "password",
    "label": "Password",
    "type": "password",
    "help": "Your Unicorn account password"
  },
  {
    "id": "device_id",
    "label": "Device ID (Optional)",
    "type": "text",
    "help": "Specific device ID to verify"
  }
]
```

---

## 🔐 Authentication Flow

### Login Process
1. User provides email and password via frontend
2. Backend calls `ValidateUnicorn()` which:
   - POSTs credentials to `/auth/login`
   - Receives JWT token (expires in 7 days)
   - Stores credentials (email/password or JWT)
   - Validates device access

### Token Storage
- JWT tokens are stored in `UserBrandCredential.BearerToken`
- Email stored in `Username` field
- Password stored in `Password` field
- Device ID stored in `DeviceID` field

### Credential Validation
Accepts either:
- **Bearer Token:** Direct use of JWT (if already authenticated)
- **Email + Password:** Initial authentication (generates token)

---

## 📱 Supported Device: Penlight Waver

### Device Specifications
- **ID:** `unicorn-penlightwaver`
- **Type:** Smart Light & Motor Waver
- **Category:** Smart Light
- **API Endpoint:** https://api.unicornextermination.info/devices

### Supported Actions
| Action | Command | Parameters |
|--------|---------|------------|
| Turn Light On | `light_on` | None |
| Turn Light Off | `light_off` | None |
| Start Motor | `motor_run` | None |
| Stop Motor | `motor_stop` | None |
| Set Color | `rgb` / `color` | `color` (string) |
| Wave Effect | `wave` | `color`, `brightness`, `motor_speed`, `duration_seconds` |
| Stop Wave | `wave_stop` | None |

### Device State Fields
- `online`: boolean
- `light`: "on" / "off"
- `motor`: "running" / "stopped"
- `rgb`: color name
- `last_seen`: ISO timestamp

---

## 🧪 Testing the Implementation

### 1. Unit Test: Validate Credentials
```bash
curl -X POST http://localhost:8080/auth/brand/unicorn/test \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "auth_type": "bearer_token",
    "credentials": {
      "email": "user@example.com",
      "password": "password123"
    }
  }'
```

### 2. Expected Response (Success)
```json
{
  "is_valid": true,
  "message": "✅ Credentials verified. Found 3 device(s).",
  "device_count": 3,
  "devices": [
    {
      "id": "device-AA:BB:CC:DD:EE:FF",
      "name": "My Penlight Waver",
      "status": "online"
    }
  ]
}
```

### 3. Expected Response (Failure)
```json
{
  "is_valid": false,
  "error": "Invalid email or password"
}
```

### 4. Connect Brand
```bash
curl -X POST http://localhost:8080/auth/brand/unicorn/connect \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "auth_type": "bearer_token",
    "credentials": {
      "email": "user@example.com",
      "password": "password123"
    },
    "test_device_connection": true
  }'
```

### 5. Device Commands
```bash
# Turn Light On
curl -X POST http://localhost:8080/devices/{deviceId}/commands \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "light_on"
  }'

# Set Color
curl -X POST http://localhost:8080/devices/{deviceId}/commands \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rgb",
    "params": {
      "color": "purple"
    }
  }'

# Wave Effect
curl -X POST http://localhost:8080/devices/{deviceId}/commands \
  -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "wave",
    "params": {
      "color": "purple",
      "brightness": 200,
      "motor_speed": 80,
      "duration_seconds": 10
    }
  }'
```

---

## 📚 API Reference

### Unicorn External API Endpoints Used

#### Authentication
- **POST** `/auth/login` - Authenticate with email/password
- **POST** `/auth/verify` - Verify token validity

#### Device Management
- **GET** `/devices/mine` - List user's devices
- **GET** `/devices/{deviceId}/status` - Get device status
- **POST** `/devices/{deviceId}/light/on` - Turn light on
- **POST** `/devices/{deviceId}/light/off` - Turn light off
- **POST** `/devices/{deviceId}/motor/run` - Start motor
- **POST** `/devices/{deviceId}/motor/stop` - Stop motor
- **POST** `/devices/{deviceId}/rgb` - Set color
- **POST** `/devices/{deviceId}/wave` - Start wave
- **POST** `/devices/{deviceId}/wave/stop` - Stop wave

#### Catalog (No Auth Required)
- **GET** `/catalog/penlightwaver?lang=en` - Product info

**Full Documentation:** https://api.unicornextermination.info/docs/Unicorn_EXTERNAL_API.md

---

## 🚀 Deployment Checklist

- [x] Add unicorn.go device executor
- [x] Add ValidateUnicorn to credential validator
- [x] Update ValidBrands in device model
- [x] Update CredentialValidator interface
- [x] Create database setup SQL (unicorn_products_insert.sql)
- [x] Verify project builds successfully
- [ ] Run SQL to insert brand/products into database
- [ ] Test credential validation endpoint
- [ ] Test device listing
- [ ] Test device commands
- [ ] Test token refresh (7-day expiry handling)

---

## 🔄 Implementation Pattern (Following Govee)

### Pattern Used Across All Brands
Each brand follows this consistent pattern:

1. **Device Handler** (`internal/device/{brand}.go`)
   - Executor struct for command execution
   - Command builder function
   - Parameter validators

2. **Credential Validator** (`internal/device/credential_validator.go`)
   - Brand-specific validation method
   - API authentication test
   - Device list retrieval

3. **Brand Model** (`internal/models/device.go`)
   - Add to ValidBrands list

4. **Database Setup** (`docs/{brand}_products_insert.sql`)
   - Brand entry
   - Products
   - Credential field definitions

### Unicorn-Specific Additions

**Unique Aspects:**
- JWT-based authentication (vs API keys for Govee)
- Email/password credentials
- Motor control (in addition to light)
- Wave/timed effects

**Consistent Aspects:**
- Follows command builder pattern
- Uses template executor
- Integrates with brand registry
- Supports credential validation

---

## 🎯 Future Enhancements

### Potential Additions
1. **Token Refresh:** Handle JWT expiry (currently 7 days)
2. **Multiple Devices:** Auto-discover all user devices
3. **Scenes:** Support Unicorn scene presets (if available)
4. **Automation:** Trigger waves based on events
5. **Store Integration:** Link to Unicorn storefront (`/store` endpoints)
6. **Webhooks:** Real-time device state updates

### Product Catalog Integration
The Unicorn store API (`https://unicornextermination.info/docs/STORE_API_SPEC.md`) is documented but not yet integrated. Products can be:
- Listed from `/store/products`
- Associated with Unicorn brand
- Shown in affiliate recommendations

---

## 📞 Support Resources

- **API Documentation:** https://api.unicornextermination.info/docs/Unicorn_EXTERNAL_API.md
- **Store API:** https://unicornextermination.info/docs/STORE_API_SPEC.md
- **Brand Website:** https://unicornextermination.info

---

## ✅ Verification Steps

1. **Build:** `go build -v ./cmd` ✅
2. **Syntax:** All files compile without errors ✅
3. **Interface:** CredentialValidator updated with ValidateUnicorn ✅
4. **Pattern:** Follows Govee implementation pattern ✅
5. **Documentation:** Complete API reference ✅

---

## 📝 Notes

- Unicorn credentials are stored encrypted in the database
- JWT tokens expire after 7 days
- Optional device_id parameter allows verifying specific devices
- Color validation ensures only valid Unicorn colors are used
- Wave parameters validated according to API limits

---

**Implementation complete as of September 9, 2026**  
**Ready for database setup and testing**

# API Spec Updates for Setup Wizard Redesign

These are the exact additions/changes to add to `/docs/api-spec.md` under the "Brand Authentication & Credentials" section.

---

## Added Content: Setup Guide Steps with Device Testing

Insert this into the Brand Authentication section, after the "Brand Credentials Endpoints" subsection:

```markdown

### Setup Wizard Guide (`/auth/brand/<brand_id>/setup-guide`)

The setup wizard provides step-by-step instructions for connecting a brand's API. Each step can include credential input, device testing, or informational content.

#### GET /auth/brand/<brand_id>/setup-guide

Retrieve the setup wizard for a specific brand.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `language` | Current user locale | Language code (e.g., `en`, `ja`) |

**Response `200`:**
```json
{
  "id": "setup_guide_govee_en_v1",
  "brand_id": "govee",
  "brand_name": "Govee",
  "language": "en",
  "total_steps": 3,
  
  "steps": [
    {
      "order": 1,
      "title": "Welcome to Govee Setup",
      "content": "This wizard will help you set up your Govee API access so you can control your lights.",
      "step_type": "info",
      
      "requires_credentials": false,
      "credential_fields": [],
      
      "allow_device_test": false
    },
    
    {
      "order": 2,
      "title": "Enter Your Govee API Key",
      "content": "Get your API key from the Govee Home app: Profile → About Us → Request API Key",
      "step_type": "credentials",
      
      "requires_credentials": true,
      "credential_fields": [
        {
          "id": "api_key",
          "label": "Govee API Key",
          "type": "password",
          "help": "Get from Govee account settings",
          "help_key": "brand.govee.description",
          "placeholder": "Enter your API key..."
        }
      ],
      
      "allow_device_test": true,
      "device_test_label": "Test Connection",
      "device_test_help": "Optional: Verify the API key works by retrieving your connected devices"
    },
    
    {
      "order": 3,
      "title": "All Set!",
      "content": "Your Govee integration is ready. You can now control devices from conditions.",
      "step_type": "confirm",
      
      "requires_credentials": false,
      "credential_fields": [],
      
      "allow_device_test": false
    }
  ]
}
```

**Step object fields:**

| Field | Type | Description |
|-------|------|-------------|
| `order` | integer | Step sequence number (1-based) |
| `title` | string | Step title/heading |
| `content` | string | Step description (Markdown or plain text) |
| `step_type` | string | `"info"` (informational), `"credentials"` (credential entry), `"confirm"` (confirmation) |
| `requires_credentials` | boolean | Whether this step requires credential input |
| `credential_fields` | array | List of credential fields to render (if `requires_credentials: true`) |
| `allow_device_test` | boolean | **[NEW]** Whether user can optionally test device connectivity on this step |
| `device_test_label` | string | **[NEW, Optional]** Custom button label for device test (default: "Test Connection") |
| `device_test_help` | string | **[NEW, Optional]** Help text describing what device test does |

**Credential field object** (same as in `/catalog/brands`):

```json
{
  "id": "api_key",
  "label": "Govee API Key",
  "type": "password|text|info",
  "help": "Human-readable help text",
  "help_key": "i18n.key.for.help",
  "placeholder": "Enter your API key..."
}
```

---

### POST /auth/brand/<brand_id>/save-credentials (UPDATED)

Save brand credentials with **automatic validation**. Replaces the need for a separate test step.

**Updated request body:**
```json
{
  "step_number": 1,
  "credentials": {
    "api_key": "sk_live_...",
    "device_id": "optional_field"
  },
  "skip_validation": false,
  "test_device_connection": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `step_number` | integer | Current wizard step number |
| `credentials` | object | Credential payload (varies by brand) |
| `skip_validation` | boolean | **[OPTIONAL]** Skip credential validation (default: `false` — always validate) |
| `test_device_connection` | boolean | **[NEW, OPTIONAL]** Also attempt to retrieve devices (default: `false`) |

**Updated response `200` (success):**
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
  
  "device_test": null
}
```

**If `test_device_connection: true` was requested:**
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
  
  "device_test": {
    "is_connected": true,
    "device_count": 3,
    "devices": [
      { "id": "device_1", "name": "Living Room Light", "status": "online" },
      { "id": "device_2", "name": "Bedroom Light", "status": "offline" },
      { "id": "device_3", "name": "Kitchen Light", "status": "online" }
    ]
  }
}
```

**Response `422` (validation failed — credentials not saved):**
```json
{
  "success": false,
  
  "validation": {
    "is_valid": false,
    "error": "Invalid API key. Check your Govee account settings.",
    "suggestion": "Try regenerating a new API key from the Govee Home app: Profile → About Us → Request API Key"
  },
  
  "device_test": null
}
```

**Key behavior changes:**
- **Credentials are always validated on save** — if invalid, they are NOT saved and user gets error
- **Device test is optional** — if requested, it happens AFTER validation passes
- **Validation failure blocks save** — user must fix credentials before proceeding
- **Device test failure does not block save** — user can proceed even if device test fails (optional step)

**Error responses:**
- `400` — invalid credentials format (e.g., missing required field)
- `401` — not authenticated
- `422` — credentials validation failed (API rejected credentials)

---

### POST /auth/brand/<brand_id>/test-device-connection (NEW OPTIONAL)

**[NEW ENDPOINT]** Separately test device connectivity without saving or re-entering credentials. This is called if user checks "Test Connection" on a credential step.

**Purpose:** Verify that credentials work and can retrieve device list, without requiring a separate wizard step.

**Request body:**
```json
{
  "credentials": {
    "api_key": "sk_live_...",
    "device_id": "optional"
  }
}
```

**Response `200` (connection successful):**
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

**Response `200` (connection failed, but request was valid):**
```json
{
  "is_connected": false,
  "error": "Could not retrieve devices with these credentials",
  "suggestion": "Verify the API key is correct and has device access enabled"
}
```

**HTTP status codes:**
- `200` — request successful (regardless of connection result)
- `400` — invalid credentials format
- `401` — not authenticated
- `422` — credentials format valid but API rejected them (e.g., invalid API key)

**Key properties:**
- ✅ **Non-blocking** — does not affect wizard progression
- ✅ **Idempotent** — can be called multiple times without side effects
- ✅ **Async-friendly** — frontend can call without waiting for response
- ✅ **Informational only** — does not save state or credentials
- ✅ **Optional** — only called if user requests device test

---

### Wizard Flow Diagram

**Current (Before):**
```
Intro
  ↓
Enter Credentials
  ↓
[Test] ← Separate step, can fail and loop
  ↓
Confirm/Done
```

**New (After):**
```
Intro
  ↓
Enter Credentials + [Optional Test Connection]
  - On Save: Auto-validate (blocks if invalid)
  - On Test: Async device check (non-blocking)
  ↓
Confirm/Done
```

**Benefits:**
- ✅ Cleaner flow (3 steps instead of 4)
- ✅ Faster completion (validation on save, no separate test step)
- ✅ More flexible testing (optional device check doesn't block)
- ✅ Clear separation (credential validation vs device connectivity)

---

### Migration Notes: Backward Compatibility

**For old clients still using single-step test:**

1. Old clients will still receive the new fields in step response
2. If `allow_device_test: true`, old client can ignore it (shows nothing)
3. Old `allow_credential_test` field is **deprecated** but still sent for compatibility

**Recommendation:** All clients migrate to the new fields within 1-2 quarters.

```

---

## Where to Insert This

In `/docs/api-spec.md`, find the section:
```
## Brand Authentication & Credentials ⚠️ NOT YET IMPLEMENTED
```

Add all the content above after the "Brand Credentials Endpoints" section and before "Database Schema (PostgreSQL)".

---

## Files to Share with Backend

1. `/docs/SETUP-WIZARD-REDESIGN.md` — Overall design vision
2. `/docs/SETUP-WIZARD-API-REQUIREMENTS.md` — Specific action items (what to build)
3. This file — Exact API spec additions

**Recommendation:** Share all three for context and implementation details.


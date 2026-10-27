# Generic SSO (Single Sign-On) Pattern

## Overview

The Taucho Portal now supports a generic SSO authentication pattern for brands that use email-based authentication. This pattern is **brand-agnostic** and works for any brand with `authentication_type: 'sso'`.

Currently, **Unicorn** (Unicorn Extermination Section) is the first brand to implement this pattern.

---

## How It Works

### User Flow

```
User clicks "Connect with SSO" on unconnected brand card
    ↓
GET /auth/brand/{brandId}/check-sso
    ↓
    ├─ exists_in_brand = true
    │  └─ Backend automatically registered user
    │  └─ registered_with_us = true
    │  └─ ✅ Show "Connected!", reload page
    │
    └─ exists_in_brand = false
       └─ Show confirmation: "Create new account?"
          ├─ YES → POST /auth/brand/{brandId}/register-sso
          │        └─ ✅ Account created, reload page
          └─ NO → Cancel
```

**Key Change from Previous Version:**
- When a user exists in the brand system but we don't have them registered yet, the **backend automatically registers them** during the check
- No need for a separate registration step if `exists_in_brand: true`
- Only show registration dialog if `exists_in_brand: false`

---

## Endpoints

### 1. Check User Status
**Endpoint:** `GET /auth/brand/{brandId}/check-sso`

**Required Headers:**
```
X-User-ID: {user_id}
```

**Query Parameters:** None (email is retrieved from session)

**Response (200 OK) - User Exists (Auto-Registered):**
```json
{
  "exists_in_brand": true,
  "registered_with_us": true,
  "credential_id": "ubcred_...",
  "device_count": 2,
  "message": "User found in brand and automatically registered with us"
}
```

**Response (200 OK) - User Doesn't Exist:**
```json
{
  "exists_in_brand": false,
  "registered_with_us": false,
  "credential_id": null,
  "device_count": 0,
  "message": "User does not exist in brand system"
}
```

**Error Responses:**
- `401` - Missing/invalid X-User-ID header
- `404` - Brand doesn't exist
- `500` - Server error

---

### 2. Register New User (Only if `exists_in_brand: false`)
**Endpoint:** `POST /auth/brand/{brandId}/register-sso`

**Required Headers:**
```
X-User-ID: {user_id}
Content-Type: application/json
```

**Request Body:**
```json
{}
```
(Empty body - email is auto-filled from logged-in user)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created in brand successfully",
  "email": "user@example.com",
  "user_id": 789,
  "credential_id": "ubcred_1726588615234"
}
```

**Error Responses:**
- `400` - Invalid email or other validation error
- `401` - Missing/invalid X-User-ID header
- `409` - User already registered
- `500` - Server error

---

## Frontend Implementation

### In `public/js/brand-settings.js`

The `openSSOModal(brandId)` function handles the simplified flow:

```javascript
async function openSSOModal(brand) {
  // 1. Check if user exists in brand system
  const checkResponse = await fetch(
    `/auth/brand/${encodeURIComponent(meta.id)}/check-sso`,
    { credentials: 'include' }
  ).then(r => r.json());
  
  // 2. If exists in brand (backend auto-registered them)
  if (checkResponse.exists_in_brand && checkResponse.registered_with_us) {
    // User already connected - reload
    showToast('✅ Connected!');
    window.location.reload();
    return;
  }
  
  // 3. If doesn't exist in brand - ask to create
  if (!checkResponse.exists_in_brand) {
    const ok = confirm('Create new account?');
    if (!ok) return;
    
    // Register the user
    const regResp = await fetch(
      `/auth/brand/${encodeURIComponent(meta.id)}/register-sso`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'include'
      }
    ).then(r => r.json());
    
    if (!regResp.success) {
      showToast(`❌ ${regResp.message}`);
      return;
    }
    
    showToast('✅ Connected!');
    window.location.reload();
  }
}
```

### In `templates/pages/brand-settings.html`

Brands with SSO appear in the brand settings grid. The button triggers the SSO flow:

```html
<button type="button" class="btn-connect" onclick="handleBrandAction('brand-id')">
  Connect with SSO
</button>
```

The `handleBrandAction()` function routes to `openSSOModal()` if `authentication_type === 'sso'`.

---

## Adding a New SSO Brand

To support SSO for a new brand:

### Backend
1. Implement two endpoints:
   - `GET /auth/brand/{brandId}/check-sso` - Check status (auto-register if exists)
   - `POST /auth/brand/{brandId}/register-sso` - Create new account (if doesn't exist)

2. Register the brand in the database with `authentication_type: 'sso'`

### Frontend
**No changes needed!** The generic `openSSOModal()` function handles any brand with `authentication_type: 'sso'`.

---

## Important Notes

- **Email is automatic** - Comes from logged-in user's session
- **Auto-registration** - If user exists in brand system, backend automatically registers them
- **No password setup** - Email-only registration, no password entry needed
- **Session-based** - Uses X-User-ID header (set by main.go server-side)
- **Automatic reload** - Page reloads after successful connection

---

## Testing Locally

```bash
# 1. Ensure you're logged in to Taucho
# 2. Navigate to /brand-settings
# 3. Click "Connect with SSO" on an SSO-enabled brand
# 4. Confirm the popup
# 5. Page should reload with connection status updated
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "HTTP 401" | X-User-ID missing | Ensure user session is active |
| "HTTP 404" | Brand not found | Check brand ID and backend configuration |
| "User already registered" | HTTP 409 | User already connected, try refreshing |
| "Registration failed" | Invalid email or DB error | Check backend logs |

---

**Last Updated:** September 18, 2026  
**Generic Pattern Version:** 2.0 (Auto-registration enabled)

# Generic SSO (Single Sign-On) Pattern

## Overview

The Taucho Portal now supports a generic SSO authentication pattern for brands that use email-based authentication. This pattern is **brand-agnostic** and works for any brand with `authentication_type: 'sso'`.

Currently, **Unicorn** (Unicorn Extermination Section) is the first brand to implement this pattern.

---

## How It Works

### User Flow

```
User clicks "Connect with SSO" on brand card
    ↓
Frontend fetches current user's email & ID
    ↓
GET /auth/brand/{brandId}/check-sso?email=user@example.com
    ↓
    ├─ User already registered
    │  └─ ✅ Show "Already connected", reload
    │
    ├─ User exists in brand system but not registered with us
    │  └─ Show confirmation: "Account found. Connect?"
    │     ├─ YES → Register/Connect
    │     └─ NO → Cancel
    │
    └─ User doesn't exist in brand system
       └─ Show confirmation: "Create new account?"
          ├─ YES → Create & Register
          └─ NO → Cancel
    ↓
POST /auth/brand/{brandId}/register-sso
    ↓
✅ Connection successful, reload page
```

---

## Endpoints

### 1. Check User Status
**Endpoint:** `GET /auth/brand/{brandId}/check-sso`

**Required Headers:**
```
X-User-ID: {user_id}
```

**Query Parameters:** None (email is retrieved from session)

**Response (200 OK):**
```json
{
  "exists_in_unicorn": true,        // Does user exist in brand system?
  "registered_with_us": true,       // Is user already connected to Taucho?
  "credential_id": "ubcred_...",    // (Optional) Credential ID if registered
  "device_count": 2,                // Number of devices
  "message": "User already registered with us"
}
```

**Error Responses:**
- `401` - Missing/invalid X-User-ID header
- `404` - User doesn't exist in brand system
- `500` - Server error

---

### 2. Register/Connect User
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

The `openSSOModal(brandId)` function handles the complete flow:

```javascript
async function openSSOModal(brand) {
  // 1. Get current user's email & ID
  const currentUser = await apiRequest('GET', '/auth/user');
  
  // 2. Check status (email comes from session via X-User-ID)
  const checkResponse = await fetch(
    `/auth/brand/${encodeURIComponent(meta.id)}/check-sso`,
    { headers: { 'X-User-ID': currentUser.id.toString() } }
  ).then(r => r.json());
  
  // 3. Handle three cases
  if (checkResponse.exists_in_unicorn && checkResponse.registered_with_us) {
    // Already connected - reload
    window.location.reload();
  } else if (checkResponse.exists_in_unicorn && !checkResponse.registered_with_us) {
    // Ask to connect existing account
    const ok = confirm('Account found. Connect?');
  } else {
    // Ask to create new account
    const ok = confirm('Create new account?');
  }
  
  // 4. Register if user confirmed
  if (ok) {
    const registerResponse = await fetch(
      `/auth/brand/${encodeURIComponent(meta.id)}/register-sso`,
      {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id.toString() },
        body: '{}'
      }
    ).then(r => r.json());
    
    if (registerResponse.success) {
      window.location.reload();
    }
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
1. Implement the three endpoints:
   - `GET /auth/brand/{brandId}/check-sso?email={email}`
   - `POST /auth/brand/{brandId}/register-sso`
   - `POST /auth/brand/{brandId}/sso-exchange` (if needed for device sync)

2. Register the brand in the database with `authentication_type: 'sso'`

### Frontend
**No changes needed!** The generic `openSSOModal()` function handles any brand with `authentication_type: 'sso'`.

---

## Important Notes

- **Email is required** - User must be logged in and have a verified email
- **No manual email entry** - Email comes from logged-in user, not prompted
- **One-click registration** - User just confirms, no password entry needed
- **Session-based** - Uses X-User-ID header, requires active session
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
| "Could not get current user" | Not logged in | Log in first |
| "HTTP 401" | X-User-ID missing | Ensure user session is active |
| "HTTP 404" | Endpoint not implemented | Backend needs to implement check-sso endpoint |
| "User already registered" | HTTP 409 | User already connected, just reload |
| "Registration failed" | Invalid email or DB error | Check backend logs |

---

**Last Updated:** September 17, 2026
**Generic Pattern Version:** 1.0

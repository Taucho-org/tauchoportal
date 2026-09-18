# Unicorn Frontend Integration - Quick Reference Card

## 3 Endpoints You Need

### 1️⃣ Check User
```
GET /auth/brand/unicorn/check-sso?email=user@example.com
Header: X-User-ID: 123

Response: {
  "exists_in_unicorn": true/false,
  "registered_with_us": true/false,
  "device_count": 0
}
```

### 2️⃣ Register User
```
POST /auth/brand/unicorn/register-sso
Header: X-User-ID: 123
Body: {}

Response: {
  "success": true,
  "credential_id": "ubcred_...",
  "user_id": 789
}
```

### 3️⃣ Connect (Get Devices)
```
POST /auth/brand/unicorn/sso-exchange
Header: (none)
Body: { "assertion": "eyJ..." }

Response: {
  "success": true,
  "devices": [
    {"id": "device-AA:BB:...", "name": "...", "online": true}
  ],
  "device_count": 1
}
```

---

## Frontend Flow

```
1. User visits Unicorn section
   ↓
2. GET /auth/brand/unicorn/check-sso?email=user@email
   ↓
   ├─ exists_in_unicorn = false
   │  └─ Show: "No account. Create one?"
   │     ├─ User clicks YES
   │     │  └─ POST /auth/brand/unicorn/register-sso → success
   │     └─ User clicks NO
   │        └─ Exit
   │
   └─ exists_in_unicorn = true
      ├─ registered_with_us = true
      │  └─ Already connected, load devices
      └─ registered_with_us = false
         └─ Show: "Account found. Connect?"
            ├─ User clicks YES
            │  └─ Continue to step 3
            └─ User clicks NO
               └─ Exit

3. POST /auth/brand/unicorn/sso-exchange with assertion
   ↓
   ├─ success = true
   │  └─ Display devices
   └─ success = false
      └─ Show error message
```

---

## Status Codes Cheat Sheet

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Data returned successfully |
| 201 | Created | Registration successful |
| 400 | Bad Request | Check your input (email, body) |
| 401 | Unauthorized | Missing X-User-ID header |
| 404 | Not Found | User doesn't exist in Unicorn |
| 409 | Conflict | User already exists |
| 422 | Invalid Assertion | Bad SSO assertion (expired?) |
| 500 | Server Error | Contact support |

---

## Example JavaScript

```javascript
// Check
const checkResp = await fetch(
  `/auth/brand/unicorn/check-sso?email=${email}`,
  { headers: { 'X-User-ID': userId } }
).then(r => r.json());

// Register
const regResp = await fetch(
  '/auth/brand/unicorn/register-sso',
  {
    method: 'POST',
    headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
    body: '{}'
  }
).then(r => r.json());

// Connect
const connResp = await fetch(
  '/auth/brand/unicorn/sso-exchange',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assertion: ssoAssertion })
  }
).then(r => r.json());
```

---

## What You Need from Taucho

1. **User Email** - Already have if logged in
2. **User ID** - Use for X-User-ID header
3. **SSO Assertion JWT** - Created by Taucho backend before calling endpoint 3

---

## Files to Reference

📄 `UNICORN_FRONTEND_INTEGRATION_GUIDE.md` - Full documentation with all details
📄 `UNICORN_API_REQUIRED_CHANGES.md` - What Unicorn API needs to implement
📄 `UNICORN_SSO_IMPLEMENTATION.md` - Architecture & security details

---

## Testing Locally

```bash
# Terminal 1: Start API server
cd tauchoapis
go run ./cmd

# Terminal 2: Test endpoints
curl -X GET "http://localhost:8080/auth/brand/unicorn/check-sso?email=test@example.com" \
  -H "X-User-ID: 123"
```

---

**Last Updated:** September 17, 2026

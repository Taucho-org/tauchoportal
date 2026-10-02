# Unicorn Frontend Integration - Quick Reference Card

## 3 Endpoints You Need

### 1️⃣ Check User
```
GET /auth/brand/unicorn/check-sso
Header: X-User-ID: 123
(Email auto-retrieved from users database)

Response: {
  "exists_in_brand": true/false,
  "registered_with_us": true/false,
  "device_count": 0
}
```

*Alternative with explicit email (if not in database):*
```
GET /auth/brand/unicorn/check-sso?user_email=user@example.com
Header: X-User-ID: 123
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

## Frontend Flow (Simplified!)

```
1. User visits Unicorn section
   ↓
2. GET /auth/brand/unicorn/check-sso
   (uses logged-in user's email automatically)
   ↓
   ├─ exists_in_brand = false
   │  └─ Show: "No account in Unicorn. Create one?"
   │     ├─ User clicks YES
   │     │  └─ POST /auth/brand/unicorn/register-sso
   │     │     └─ If success → Continue to step 3
   │     └─ User clicks NO
   │        └─ Exit
   │
   └─ exists_in_brand = true
      └─ registered_with_us = true (auto-created!)
         └─ User already registered ✓
            └─ Continue directly to step 3 (SSO Exchange)

3. POST /auth/brand/unicorn/sso-exchange
   ↓
   ├─ success = true
   │  └─ Display devices
   └─ success = false
      └─ Show error message
```

**Key Difference:**
- ✅ If user exists in Unicorn: Auto-registered! Skip registration step, go straight to SSO exchange
- ❌ If user doesn't exist: Must call register endpoint first

---

## Status Codes Cheat Sheet

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Data returned successfully |
| 201 | Created | Registration successful |
| 400 | Bad Request | Check X-User-Email header or auth setup |
| 401 | Unauthorized | Missing X-User-ID header |
| 404 | Not Found | Brand not found |
| 409 | Conflict | User already exists |
| 422 | Invalid Assertion | Bad SSO assertion (expired?) |
| 500 | Server Error | Contact support |

---

## Example JavaScript

```javascript
// Check (email automatically retrieved from database)
const checkResp = await fetch(
  '/auth/brand/unicorn/check-sso',
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

1. **User Email** - Automatically retrieved from users database table
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
# Standard (email from database)
curl -X GET "http://localhost:8080/auth/brand/unicorn/check-sso" \
  -H "X-User-ID: 123"

# With explicit email (if user has no email)
curl -X GET "http://localhost:8080/auth/brand/unicorn/check-sso?user_email=test@example.com" \
  -H "X-User-ID: 123"
```

---

**Last Updated:** September 18, 2026

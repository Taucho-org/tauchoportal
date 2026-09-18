# Unicorn SSO Integration - Complete Endpoint Reference

## Overview
This document lists all endpoints needed for frontend integration with Unicorn device management via SSO.

---

## Endpoints Summary

| # | HTTP Method | Endpoint | Auth | Purpose | Status |
|---|-------------|----------|------|---------|--------|
| 1 | GET | `/auth/brand/unicorn/check-sso` | X-User-ID | Check if user exists in Unicorn | ✅ Implemented |
| 2 | POST | `/auth/brand/unicorn/register-sso` | X-User-ID | Register new user in Unicorn | ✅ Implemented |
| 3 | POST | `/auth/brand/unicorn/sso-exchange` | None | Connect via SSO (get JWT) | ✅ Implemented |

---

## Detailed Endpoint Documentation

### 1. Check User Existence

**Endpoint:** `GET /auth/brand/unicorn/check-sso`

**Purpose:** Check if user exists in Unicorn and in our database

**Authentication:** Required
```
Header: X-User-ID: {user_id}
```

**Query Parameters:**
```
email=user@example.com
```

**Example Request:**
```bash
curl -X GET "http://localhost:8080/auth/brand/unicorn/check-sso?email=user@example.com" \
  -H "X-User-ID: 123"
```

**Response: User Exists (200 OK)**
```json
{
  "exists_in_unicorn": true,
  "registered_with_us": true,
  "credential_id": "ubcred_1726588615234",
  "device_count": 2,
  "message": "User already registered with us"
}
```

**Response: Exists in Unicorn, Not Registered With Us (200 OK)**
```json
{
  "exists_in_unicorn": true,
  "registered_with_us": false,
  "credential_id": null,
  "device_count": 0,
  "message": "User exists in Unicorn but needs to register with us"
}
```

**Response: User Does Not Exist (404 Not Found)**
```json
{
  "exists_in_unicorn": false,
  "registered_with_us": false,
  "credential_id": null,
  "device_count": 0,
  "message": "User does not exist in Unicorn"
}
```

**Error Responses:**
- `400 Bad Request` - Missing email parameter
- `401 Unauthorized` - Missing/invalid X-User-ID header
- `500 Internal Server Error` - Unicorn API unreachable

---

### 2. Register New User

**Endpoint:** `POST /auth/brand/unicorn/register-sso`

**Purpose:** Register new Unicorn user account (email only, no password)

**Authentication:** Required
```
Header: X-User-ID: {user_id}
```

**Request Body:**
```json
{}
```
(Empty body - email is auto-filled from logged-in user's email)

**Example Request:**
```bash
curl -X POST "http://localhost:8080/auth/brand/unicorn/register-sso" \
  -H "X-User-ID: 123" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response: Success (201 Created)**
```json
{
  "success": true,
  "message": "Account created in Unicorn successfully",
  "email": "user@example.com",
  "user_id": 789,
  "credential_id": "ubcred_1726588615234",
  "next_step": "connect"
}
```

**Response: User Already Exists (409 Conflict)**
```json
{
  "success": false,
  "message": "User already has Unicorn account connected",
  "email": "user@example.com"
}
```

**Response: Invalid Email (400 Bad Request)**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**Error Responses:**
- `400 Bad Request` - Email validation failed
- `401 Unauthorized` - Missing/invalid X-User-ID header
- `409 Conflict` - User already registered
- `500 Internal Server Error` - Database or API error

---

### 3. Connect via SSO (Get Devices)

**Endpoint:** `POST /auth/brand/unicorn/sso-exchange`

**Purpose:** Exchange Taucho SSO assertion for Unicorn JWT and get device list

**Authentication:** Not Required (SSO entry point)
```
No headers needed
```

**Request Body:**
```json
{
  "assertion": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

The assertion is a signed JWT created by Taucho containing:
- `iss`: https://api.taucho.org
- `aud`: https://api.unicornextermination.info
- `sub`: Taucho user ID
- `email`: user@example.com
- `jti`: Unique assertion ID (for replay prevention)
- `iat`: Issued at timestamp
- `exp`: Expiration (max 5 minutes)

**Example Request:**
```bash
curl -X POST "http://localhost:8080/auth/brand/unicorn/sso-exchange" \
  -H "Content-Type: application/json" \
  -d '{
    "assertion": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS50YXVjaG8ub3JnIiwi..."
  }'
```

**Response: Success (200 OK)**
```json
{
  "success": true,
  "message": "✅ Taucho SSO login successful. Found 2 device(s).",
  "device_count": 2,
  "devices": [
    {
      "id": "device-AA:BB:CC:DD:EE:FF",
      "name": "My Penlight Waver",
      "online": true,
      "status": "online"
    },
    {
      "id": "device-11:22:33:44:55:66",
      "name": "Lab Penlight Waver",
      "online": false,
      "status": "offline"
    }
  ]
}
```

**Response: Invalid Assertion (422 Unprocessable Entity)**
```json
{
  "success": false,
  "message": "SSO assertion validation failed",
  "validation": {
    "is_valid": false,
    "error": "Invalid JWT signature",
    "suggestion": "Invalid JWT signature"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing assertion parameter
- `422 Unprocessable Entity` - Assertion validation failed (invalid sig, expired, replay)
- `500 Internal Server Error` - Unicorn API unreachable

---

## Frontend Flow (Complete Example)

```typescript
// Step 1: Check if user exists
async function checkUnicornUser(email: string, userId: number) {
  const response = await fetch(
    `/auth/brand/unicorn/check-sso?email=${encodeURIComponent(email)}`,
    {
      method: 'GET',
      headers: {
        'X-User-ID': String(userId)
      }
    }
  );
  
  const data = await response.json();
  
  if (!data.exists_in_unicorn) {
    // User doesn't exist - show registration dialog
    return { action: 'register_new' };
  } else if (!data.registered_with_us) {
    // User exists in Unicorn but not linked to our account
    return { action: 'register_existing' };
  } else {
    // Already connected
    return { action: 'already_connected', devices: data };
  }
}

// Step 2a: Register new user (if doesn't exist)
async function registerNewUnicornUser(userId: number) {
  const response = await fetch('/auth/brand/unicorn/register-sso', {
    method: 'POST',
    headers: {
      'X-User-ID': String(userId),
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Account created, proceed to connect
    return { action: 'connect', credential_id: data.credential_id };
  } else {
    // Handle error
    alert(`Error: ${data.message}`);
    return { action: 'error' };
  }
}

// Step 3: Connect via SSO (get JWT and devices)
async function connectViaSSO(assertion: string) {
  const response = await fetch('/auth/brand/unicorn/sso-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ assertion })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show devices
    console.log('Devices:', data.devices);
    // Store JWT for later use
    return { 
      action: 'devices_loaded', 
      devices: data.devices,
      device_count: data.device_count
    };
  } else {
    // Handle error
    alert(`Error: ${data.message}`);
    return { action: 'error' };
  }
}

// Full flow
async function setupUnicorn(email: string, userId: number, ssoAssertion: string) {
  // Step 1: Check existence
  const checkResult = await checkUnicornUser(email, userId);
  
  if (checkResult.action === 'register_new') {
    // Show dialog: "You don't have Unicorn account yet. Register?"
    const userConfirmed = await showRegistrationDialog();
    if (!userConfirmed) return;
    
    // Register
    const regResult = await registerNewUnicornUser(userId);
    if (regResult.action === 'error') return;
  }
  
  // Step 3: Connect via SSO
  const connectResult = await connectViaSSO(ssoAssertion);
  if (connectResult.action === 'devices_loaded') {
    // Show devices to user
    displayDevices(connectResult.devices);
  }
}
```

---

## Base URL

All endpoints are at: `http://localhost:8080` (local dev) or `https://api.taucho.org` (production)

---

## Authentication Header

All endpoints requiring authentication use the `X-User-ID` header:
```
X-User-ID: {user_id}
```

Where `{user_id}` is the authenticated Taucho user's ID.

---

## Error Handling

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```

Common HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid auth
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

---

## Implementation Notes

### Note 1: Email Requirement
The `check-sso` endpoint requires an email query parameter. Get this from:
1. JWT claims (best option)
2. User profile API call
3. User input field

### Note 2: SSO Assertion Format
The assertion is a JWT signed by Taucho's private key. It's created server-side in Taucho, never client-side.

Format:
```
Header: {
  "typ": "JWT",
  "alg": "RS256"
}
Payload: {
  "iss": "https://api.taucho.org",
  "aud": "https://api.unicornextermination.info",
  "sub": "taucho-user-id",
  "email": "user@example.com",
  "jti": "unique-assertion-id",
  "iat": 1726588615,
  "exp": 1726588915
}
```

### Note 3: Credential Status
After registration, the credential status is `"registering"`. After SSO exchange, it becomes `"connected"`.

### Note 4: Device ID Format
Unicorn device IDs follow this format:
```
device-{MAC_ADDRESS}
Example: device-AA:BB:CC:DD:EE:FF
```

---

## Testing Endpoints

### Test 1: Check User (Doesn't Exist)
```bash
curl -X GET "http://localhost:8080/auth/brand/unicorn/check-sso?email=newuser@example.com" \
  -H "X-User-ID: 123"
```
Expected: `{"exists_in_unicorn": false}`

### Test 2: Register User
```bash
curl -X POST "http://localhost:8080/auth/brand/unicorn/register-sso" \
  -H "X-User-ID: 123" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"success": true, "credential_id": "..."}`

### Test 3: Connect via SSO
```bash
curl -X POST "http://localhost:8080/auth/brand/unicorn/sso-exchange" \
  -H "Content-Type: application/json" \
  -d '{"assertion": "eyJ..."}'
```
Expected: `{"success": true, "devices": [...]}`

---

## What's Next

1. ✅ Implement check-sso endpoint (done)
2. ✅ Implement register-sso endpoint (done)
3. ✅ Implement sso-exchange endpoint (already existed)
4. Frontend: Build UI for check → register → connect flow
5. Testing: End-to-end with real users
6. Deployment: Push to production

---

**Last Updated:** September 17, 2026
**Version:** 1.0 - Complete

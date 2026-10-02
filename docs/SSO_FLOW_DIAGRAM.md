# SSO Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    User at Brand Settings Page                          │
│                                                                         │
│  [Brand Card: Unicorn (SSO)]                                           │
│  ┌────────────────────────────────────┐                               │
│  │ Unicorn Extermination              │                               │
│  │                                    │                               │
│  │ [Connect with SSO]  ← Click        │                               │
│  └────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ openSSOModal()      │
                    │ called with brand   │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────────────────────┐
                    │ GET /auth/user                      │
                    │ Get current user's email & ID       │
                    └─────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────────────┐
         │ GET /auth/brand/{brandId}/check-sso               │
         │ ?email={email}                                    │
         │ Header: X-User-ID: {id}                           │
         └────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    (Case 1)            (Case 2)              (Case 3)
    User exists &       User exists &         User doesn't
    registered w/ us    NOT registered        exist
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
      Show:             Show:                  Show:
      ✅ Already      "Connect existing     "Create new
      Connected      account?"              account?"
         │                    │                    │
         │ Auto             ┌──┴──┐            ┌──┴──┐
         │ Reload      YES /      \ NO    YES /      \ NO
         │             │            │       │         │
         │             ▼            ▼       ▼         ▼
         │          Register    Cancel   Register   Cancel
         │             │                    │
         └─────────────┴────────────────────┴─────────┐
                       │                               │
                       ▼                               ▼
    ┌──────────────────────────────────────┐      (Exit)
    │ POST /auth/brand/{brandId}/register-sso
    │ Header: X-User-ID: {id}
    │ Body: {}
    └──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    Success (201)              Error (400/409/500)
         │                           │
         ▼                           ▼
    ✅ Show:                   ❌ Show Error
    "Connected to            Toast with
    {Brand}!"                 Error Message
         │                           │
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
              Page Reload (1.5s)
                     │
                     ▼
         ┌──────────────────────────┐
         │ Brand Card Updated        │
         │ Status: Connected ✅      │
         │ Shows connected_at        │
         └──────────────────────────┘
```

---

## Response Decision Tree

```
                    ┌─────────────────────────┐
                    │  Check-SSO Response     │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
  exists_in_unicorn:      exists_in_unicorn:    exists_in_unicorn:
  TRUE                    TRUE                  FALSE
  registered_with_us:     registered_with_us:
  TRUE                    FALSE
         │                       │                       │
         │                       │                       │
    ┌────┴────┐            ┌─────┴─────┐         ┌──────┴──────┐
    │          │            │           │         │             │
  Case 1      ✅           Case 2      ❓       Case 3         ➕
  Already                  Found        Ask:      Doesn't        Ask:
  Connected               existing      Connect?  exist          Create?
  → Reload                account                 → Confirm     → Confirm
    (1s)                  → Confirm               registration   registration
                           registration
                           → Continue
```

---

## Request/Response Examples

### Step 1: Check Status (User Already Registered)

**Request:**
```
GET /auth/brand/unicorn/check-sso
X-User-ID: 123
```

**Response:**
```json
{
  "exists_in_unicorn": true,
  "registered_with_us": true,
  "credential_id": "ubcred_abc123",
  "device_count": 3,
  "message": "User already registered with us"
}
```

**Frontend Action:**
```
Show: ✅ "Unicorn is already connected!"
Wait: 1 second
Action: Reload page
```

---

### Step 2: Check Status (User Exists, Not Registered)

**Request:**
```
GET /auth/brand/unicorn/check-sso
X-User-ID: 456
```

**Response:**
```json
{
  "exists_in_unicorn": true,
  "registered_with_us": false,
  "credential_id": null,
  "device_count": 0,
  "message": "User exists in Unicorn but needs to register with us"
}
```

**Frontend Action:**
```
Show Dialog: "Account found in Unicorn. Connect it to your Taucho account?"
├─ YES: Continue to Step 3
└─ NO: Cancel
```

---

### Step 3: Check Status (User Doesn't Exist)

**Request:**
```
GET /auth/brand/unicorn/check-sso
X-User-ID: 789
```

**Response:**
```json
{
  "exists_in_unicorn": false,
  "registered_with_us": false,
  "credential_id": null,
  "device_count": 0,
  "message": "User does not exist in Unicorn"
}
```

**Frontend Action:**
```
Show Dialog: "Create a new Unicorn account with your email?"
├─ YES: Continue to Step 4
└─ NO: Cancel
```

---

### Step 4: Register User

**Request:**
```
POST /auth/brand/unicorn/register-sso
X-User-ID: 456
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created in Unicorn successfully",
  "email": "jane@example.com",
  "user_id": 999,
  "credential_id": "ubcred_xyz789"
}
```

**Frontend Action:**
```
Show: ✅ "Connected to Unicorn!"
Wait: 1.5 seconds
Action: Reload page
```

---

## Error Scenarios

### Error: User Not Logged In

**Request:**
```
GET /auth/user
```

**Response:** No user or missing email

**Frontend:**
```
Show: ❌ "Could not get current user information"
Action: Exit (no confirmation)
```

---

### Error: Missing X-User-ID Header

**Request:**
```
GET /auth/brand/unicorn/check-sso?email=user@example.com
(no X-User-ID header)
```

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Missing X-User-ID header"
}
HTTP 401
```

**Frontend:**
```
Show: ❌ "SSO authentication failed: HTTP 401"
Action: Exit
```

---

### Error: User Already Registered

**Request:**
```
POST /auth/brand/unicorn/register-sso
X-User-ID: 456
Body: {}
```

**Response:**
```json
{
  "success": false,
  "message": "User already has Unicorn account connected"
}
HTTP 409
```

**Frontend:**
```
Show: ❌ "User already has Unicorn account connected"
Action: Exit
```

---

## Timeline

```
User clicks button
       │
       ├─ 0ms     openSSOModal() starts
       ├─ 50ms    GET /auth/user (fetch current user)
       ├─ 200ms   GET /auth/brand/{}/check-sso (check status)
       ├─ 400ms   Dialog shown OR Confirm dialog shown
       ├─ 1000ms  POST /auth/brand/{}/register-sso (if confirmed)
       ├─ 1200ms  Success toast shown
       ├─ 2700ms  Page reloads
       │
       └─ ~3 seconds total
```

---

**Diagram Version:** 1.0  
**Last Updated:** September 17, 2026

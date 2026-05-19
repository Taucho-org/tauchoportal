# Required API Endpoints for tauchoportal-ui

The UI is now completely stateless and proxies all authentication through the backend API. Below are the endpoints you need to implement in your `tauchoapis` project.

## Base URL

- **Production**: `https://api.taucho.org`
- **Development**: `http://localhost:8081`

Configure this via the `API_URL` environment variable on the UI server. If not set, defaults to `http://localhost:8081`.

---

## OAuth Endpoints

### `GET /oauth/login`

**Purpose**: Return the OAuth provider login URL for the user to visit.

**Query Parameters**:
- `provider` (optional): OAuth provider name (default: "google")

**Response** (200 OK):
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Description**:
- The UI calls this endpoint to get the full Google OAuth authorization URL
- The user's browser is redirected to this URL
- Google redirects back to your API's callback endpoint (not the UI)
- Your API handles the OAuth token exchange and sets the session cookie

**Implementation Note**: 
The redirect URL in your Google OAuth config should point to your API's callback endpoint (e.g., `https://api.taucho.org/oauth/callback`), NOT the UI.

---

## Authentication Endpoints

### `GET /auth/user`

**Purpose**: Retrieve the authenticated user's profile information.

**Headers**:
- `Cookie`: Session cookie (HTTP-only, set by the API after OAuth callback)

**Response** (200 OK):
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "john_doe",
  "picture": "https://...",
}
```

**Response** (401 Unauthorized):
```json
{
  "error": "Not authenticated"
}
```

**Description**:
- The UI calls this to verify the user is logged in and fetch their profile
- Checks the session cookie sent in the request
- Returns 401 if no valid session exists
- Used by the dashboard to populate user info
- Also used by the UI to redirect to login if not authenticated

---

## Session/Cookie Management

**Session Cookie Requirements**:
- Name: `tauchoportal_session` or similar (configurable)
- HTTP-only: `true` (prevents JavaScript access, increases security)
- Secure: `true` (HTTPS only in production)
- SameSite: `Lax` or `Strict`
- Domain: Set appropriately for cross-origin requests (may be needed if UI and API are on different domains)
- Max-Age: 24 hours (or your preferred duration)

**CORS Configuration**:
If your API and UI are on different domains, you'll need to configure CORS on the API:
```
Access-Control-Allow-Origin: https://tauchoportal.yourdomain.com (or http://localhost:8080 for dev)
Access-Control-Allow-Credentials: true  (allows cookies to be sent/received)
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## OAuth Flow Diagram

```
Browser (UI)                    UI Server (Port 8080)         API Server (Port 8081)              Google OAuth

  1. Click "Login with Google"
                                    ↓
                            GET /api/oauth/login
                                    ↓
                                         -------- GET /oauth/login ----→
                                                       ↓
                                         ←------ {"auth_url": "..."} ------
                            ↓
  2. Redirect to auth_url ──────────────────────────────────────────────────→ (to Google)
                                                                                    ↓
  3. User enters credentials, Google redirects to API callback
                                                                                    ↓
                            (API handles OAuth callback, exchanges code for token,
                             creates user session, sets HTTP-only cookie)
                                    ↓
                            Redirect to: http://localhost:8080/dashboard
  4. Browser loads dashboard
                            GET /dashboard
                                    ↓
                            (Loads dashboard.html)
                                    ↓
                            JavaScript calls: GET /api/auth/check
                                         -------- GET /auth/user (with cookie) ---→
                                                       ↓
                                         ←------ {"id": 1, "email": "..."} ----
                            ↓
                            (Updates UI with user info)
```

---

## Implementation Checklist for API Project

- [ ] Create `GET /oauth/login` endpoint
  - Takes `provider` query param (default "google")
  - Generates CSRF state token
  - Returns `{"auth_url": "..."}`
  - Stores state in session (for validation in callback)

- [ ] Create `GET /oauth/callback` endpoint (for Google redirect)
  - Receives `code` and `state` from Google
  - Validates `state` against stored session
  - Exchanges `code` for Google access token
  - Fetches user info from Google using the token
  - Creates or updates user in database
  - Creates session and sets HTTP-only cookie
  - Redirects to UI dashboard (e.g., `http://localhost:8080/dashboard`)

- [ ] Create `GET /auth/user` endpoint
  - Checks for valid session cookie
  - Returns user profile or 401 if not authenticated
  - Must include fields: `id`, `email`, `username` (optional: `picture`)

- [ ] Configure CORS (if UI and API on different domains)
  - Set `Access-Control-Allow-Origin`
  - Enable `Access-Control-Allow-Credentials`

- [ ] Update environment variables in API project
  - Google OAuth credentials should remain in API (NOT in UI)
  - UI only needs `API_URL` environment variable

- [ ] Test OAuth flow end-to-end
  - UI → API → Google → API → UI
  - Verify cookie is set after callback
  - Verify dashboard loads with user info

---

## Environment Variables

**UI Server** (`tauchoportal`):
```bash
API_URL=http://localhost:8081        # Local dev
API_URL=https://api.taucho.org       # Production

PORT=8080                             # UI port
```

**API Server** (`tauchoapis`):
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
DATABASE_URL=postgresql://...

# UI callback after OAuth
# (e.g., http://localhost:8080/dashboard or https://tauchoportal.yourdomain.com/dashboard)
UI_BASE_URL=http://localhost:8080
```

---

## Security Notes

1. **Never expose credentials in UI**: OAuth secrets and API keys stay in the API layer only
2. **HTTP-only cookies**: Prevents XSS attacks from stealing session tokens
3. **CSRF protection**: Use state tokens in OAuth flow (already part of standard OAuth2)
4. **CORS carefully**: Only allow the UI domain to call the API
5. **HTTPS in production**: Both UI and API should use HTTPS for secure cookie transmission

---

## Testing Locally

1. **Terminal 1 - API Server**:
```bash
cd c:\Dev\tauchoapis
go run ./cmd -port 8081
```

2. **Terminal 2 - UI Server**:
```bash
cd c:\Dev\tauchoportal
API_URL=http://localhost:8081 go run ./cmd -port 8080
```

3. **Browser**: Visit `http://localhost:8080`
   - Click "Login with Google"
   - Should redirect to Google
   - After login, should redirect back to `http://localhost:8080/dashboard`
   - Dashboard should display user info from the API

# TauchoPortal — API Specification

This document lists every API endpoint the portal UI requires, grouped by resource.
Use it as a checklist: ✅ = already implemented on API server, 🔲 = not yet implemented.

---

## Account Data Model

One email account is the master identity. OAuth logins are children of that account.

### `users` table
```json
{
  "id": "integer (auto-increment PK)",
  "email": "string (unique, not null)",
  "password_hash": "string (bcrypt, nullable — null for OAuth-only registrations)",
  "username": "string (unique, not null — used as login identifier and @handle)",
  "picture": "string (URL)",
  "email_verified": "bool",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```
**`username` must have a UNIQUE constraint.** It serves as both the display name and the login identifier (like GitHub's `@handle`). Users can change it later but it must stay unique.

### `oauth_connections` table
> **Note:** The database table is named `oauth_accounts` internally. The spec uses `oauth_connections` as the logical concept name.

```json
{
  "id": "integer (auto-increment PK)",
  "user_id": "integer (FK → users.id, CASCADE DELETE)",
  "provider": "google | twitch | niconico | twitcasting | instagram | tiktok | kick | facebook | x | bilibili",
  "oauth_id": "string (provider's user ID — unique per provider)",
  "provider_email": "string (email from the OAuth provider, nullable)",
  "provider_username": "string (display name / handle from the OAuth provider, nullable — e.g. 'Don Taucho', 'don_twitch')",
  "provider_channel_name": "string (channel/stream name on the platform, nullable — may differ from username on YouTube/Twitch)",
  "created_at": "timestamp"
}
```
Unique constraints: `(provider, oauth_id)` and `(user_id, provider)` — one account per provider per user.

> **Note:** `provider_email`, `provider_username`, and `provider_channel_name` are populated at connect time from the OAuth userinfo response and stored for display. They are **not** re-synced on every login — they reflect the values at the time of connection. `provider_channel_name` is only meaningful for streaming platforms (YouTube channel name, Twitch display name, etc.).

> **Note:** `provider = "google"` represents a Google account used for YouTube. The portal shows YouTube branding for this provider.  
> All OAuth providers (Google, Twitch, NicoNico, TwitCasting, Instagram, Facebook, TikTok, Kick, X, and Bilibili) are now fully implemented.

### OAuth login flow
| Scenario | Behaviour |
|---|---|
| Not logged in, OAuth email matches existing user | Log in as that user; link provider if not already linked |
| Not logged in, OAuth email is new | Create `users` row (no password), create `oauth_connections` row, start session |
| Already logged in, provider not yet linked | Add `oauth_connections` row to current user |
| Already logged in, provider already linked to a **different** account | Return error `409 Conflict` |

### OAuth redirect URI setup

The portal handles the OAuth callback — the provider redirects the user's browser to the **portal** (`taucho.org`), which proxies the request to the API (`api.taucho.org`, not publicly reachable directly).

**Callback path:** `{PORTAL_BASE_URL}/auth/callback/{provider}`

| Provider | Local callback URL | Production callback URL |
|----------|--------------------|------------------------|
| Google | `http://localhost:8080/auth/callback/google` | `https://taucho.org/auth/callback/google` |
| Twitch | `http://localhost:8080/auth/callback/twitch` | `https://taucho.org/auth/callback/twitch` |
| NicoNico | `http://localhost:8080/auth/callback/niconico` | `https://taucho.org/auth/callback/niconico` |
| TwitCasting | `http://localhost:8080/auth/callback/twitcasting` | `https://taucho.org/auth/callback/twitcasting` |
| Instagram | `http://localhost:8080/auth/callback/instagram` | `https://taucho.org/auth/callback/instagram` |
| Facebook | `http://localhost:8080/auth/callback/facebook` | `https://taucho.org/auth/callback/facebook` |
| TikTok | `http://localhost:8080/auth/callback/tiktok` | `https://taucho.org/auth/callback/tiktok` |
| Kick | `http://localhost:8080/auth/callback/kick` | `https://taucho.org/auth/callback/kick` |
| X (Twitter) | `http://localhost:8080/auth/callback/x` | `https://taucho.org/auth/callback/x` |
| Bilibili | `http://localhost:8080/auth/callback/bilibili` | `https://taucho.org/auth/callback/bilibili` |

**Where to register each redirect URI:**
- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs
- **Twitch** — Twitch Developer Console → your app → OAuth Redirect URLs
- **NicoNico** — NicoNico Developer Console → your app → OAuth Redirect URLs
- **TwitCasting** — TwitCasting Developer Dashboard → your app → OAuth settings → Authorized Redirect URIs
- **Instagram** — Meta App Dashboard → Instagram → API setup with Instagram login → Set up Instagram business login → Business login settings → OAuth Redirect URIs
- **Facebook** — Same Meta App Dashboard → Facebook Login → Settings → Valid OAuth Redirect URIs
- **TikTok** — TikTok Developer Portal → your app → Authorization Settings → Redirect URLs
- **Kick** — Kick Creator Dashboard → Developer Settings → OAuth → Redirect URLs
- **X** — X Developer Portal → your app → Authentication settings → Callback URLs
- **Bilibili** — Bilibili Developer Portal → your app → OAuth configuration → Redirect URLs

**What the API does:**
1. `GET /oauth/login?provider=X` — builds the auth URL using `{PROVIDER}_REDIRECT_URL` from env, returns `{ auth_url }`.
   - **`return_url` param** *(planned, not yet implemented)*: The `return_url` query parameter is reserved for future use. The API currently ignores it — after a successful callback the API always redirects to `{PORTAL_BASE_URL}/dashboard`.
2. `GET /auth/callback/{provider}?code=...&state=...` — portal proxies this; API exchanges code, creates session, sets cookie, redirects to `{PORTAL_BASE_URL}/dashboard`.

**Required env vars on the API server (`api.taucho.org`):**
| Env var | Local value | Production value |
|---------|------------|-----------------|
| `PORTAL_BASE_URL` | `http://localhost:8080` | `https://taucho.org` |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/auth/callback/google` | `https://taucho.org/auth/callback/google` |
| `TWITCH_REDIRECT_URL` | `http://localhost:8080/auth/callback/twitch` | `https://taucho.org/auth/callback/twitch` |
| `NICONICO_REDIRECT_URL` | `http://localhost:8080/auth/callback/niconico` | `https://taucho.org/auth/callback/niconico` |
| `TWITCASTING_REDIRECT_URL` | `http://localhost:8080/auth/callback/twitcasting` | `https://taucho.org/auth/callback/twitcasting` |
| `INSTAGRAM_REDIRECT_URL` | `http://localhost:8080/auth/callback/instagram` | `https://taucho.org/auth/callback/instagram` |
| `FACEBOOK_REDIRECT_URL` | `http://localhost:8080/auth/callback/facebook` | `https://taucho.org/auth/callback/facebook` |
| `TIKTOK_REDIRECT_URL` | `http://localhost:8080/auth/callback/tiktok` | `https://taucho.org/auth/callback/tiktok` |
| `KICK_REDIRECT_URL` | `http://localhost:8080/auth/callback/kick` | `https://taucho.org/auth/callback/kick` |
| `X_REDIRECT_URL` | `http://localhost:8080/auth/callback/x` | `https://taucho.org/auth/callback/x` |
| `BILIBILI_REDIRECT_URL` | `http://localhost:8080/auth/callback/bilibili` | `https://taucho.org/auth/callback/bilibili` |

> ⚠️ **Instagram credentials** — `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` are the **Instagram App ID / Instagram App Secret** found in Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings. These are **not** the same as the main Facebook App ID shown under App Settings → Basic.

> ⚠️ **Facebook credentials** — `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` are the **main App ID / App Secret** from the same Meta app (App Settings → Basic). These are the same across Facebook and Instagram products on one Meta app — just use the top-level ones for Facebook Login.

---

## Platform Implementation Status

This chart shows the implementation completeness of each platform's integration across the full feature stack:
- **Login** — OAuth login flow implemented
- **User Info** — Fetch authenticated user's account/channel info (e.g. `GET /platform/{provider}/user/mine`)
- **Search** — Search for channels/users on the platform (e.g. `GET /platform/{provider}/search?q=...`)
- **Check Live** — Detect active livestreams on a channel (poller → provider → CheckLive)
- **Listen** — Real-time listener for livestream events (poller → listener → comments/gifts/etc)
- **Subinfo** — Parse live comments, gift donations, and other viewer interactions
- **OAuth Keys** — Whether API credentials are obtained and in production
- **Verified** — Whether officially app-verified by the platform for production use

| Platform | Login | User Info | Search | Check Live | Listen | Subinfo | OAuth Keys | Verified |
|---|---|---|---|---|---|---|---|---|
| **YouTube** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Twitch** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **NicoNico** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Instagram** | ✅ | ✅ | ✅ | 🔲 | ⚠️ | ⚠️ | ✅ | 🚫 |
| **Facebook** | ✅ | ✅ | ✅ | 🔲 | ⚠️ | ⚠️ | ✅ | 🚫 |
| **TikTok** | ✅ | ✅ | ✅ | 🔲 | ⚠️ | ⚠️ | 🔲 | 🚫 |
| **Kick** | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🔲 | ✅ | ✅ |
| **X (Twitter)** | ✅ | ✅ | ✅ | 🔲 | ⚠️ | ⚠️ | 🔲 | 🚫 |
| **Bilibili** | ✅ | ✅ | ✅ | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 |

### Legend
- **✅ Complete** — Fully implemented and production-ready
- **⚠️ Partial** — Implemented but incomplete; framework exists, missing full feature coverage
- **🔲 Not Implemented** — Returns `501 Not Implemented` or placeholder response
- **🚫 Blocked** — Intentionally unavailable or platform does not support the feature (e.g., business verification required)

### Implementation Details

**Fully Supported (Production Ready):**
- **YouTube** — Complete OAuth + YouTube Data API v3 + real-time live chat ingestion
- **Twitch** — Complete OAuth + Twitch API v5 + WebSocket IRC for chat/events
- **NicoNico** — Session-proxy login (not standard OAuth) + API + WebSocket for comments

**Partially Supported (Login + Discovery):**
- **Instagram, Facebook** — OAuth login and user/page discovery via Graph API; livestream detection and comment ingestion not yet fully implemented (framework exists; requires Graph API streaming endpoints)
- **TikTok** — OAuth login and channel discovery; live-streaming detection and comment ingestion not implemented (TikTok restricts live APIs)
- **X** — OAuth login and user search; livestream detection and real-time comment ingestion not fully implemented (requires API v2 streaming)

**Minimal/Not Implemented:**
- **Kick** — OAuth login and channel discovery; polling-based livestream detection and real-time listener (streaming activity only, no message content)
- **Bilibili** — OAuth login and user search; livestream detection and real-time listener not implemented

### OAuth Credentials Status

| Platform | Credentials Obtained | Can Use in Dev | Production Verification | Notes |
|---|---|---|---|---|
| YouTube | ✅ | ✅ | ✅ | Google Cloud project verified as business account; full API access |
| Twitch | ✅ | ✅ | ✅ | Verified application; all APIs available |
| NicoNico | ✅ | ✅ | ✅ | Session-based login; no business verification required |
| Instagram | ✅ | ✅ | 🚫 | Credentials obtained but business verification needed for production (see Meta requirements below) |
| Facebook | ✅ | ✅ | 🚫 | Credentials obtained but business verification needed for production |
| TikTok | 🔲 | 🔲 | 🚫 | Pending: Requires developer approval and app review |
| Kick | ✅ | ✅ | ✅ | Credentials obtained; app verified |
| X | 🔲 | 🔲 | 🚫 | Pending: Requires developer approval and app review |
| Bilibili | 🔲 | 🔲 | 🚫 | Pending: Credentials not yet obtained |

### Meta Business Verification (Instagram/Facebook)

To use Instagram and Facebook OAuth in production, you must:
1. Create a **Meta Business Account** (already done)
2. Create an **App** on Meta Developer Platform (already done)
3. Submit app for **Business Verification**:
   - Provide company legal name, address, and tax ID / business registration
   - Provide company website with privacy policy and terms of service
   - Meta reviews and approves (typical turnaround: 7-14 days)

Once verified, Instagram and Facebook OAuth listeners can be enabled for production by setting feature flags (not yet implemented in UI).

---

## Data Storage

When `DATABASE_URL` is set, all resources (users, watches, conditions, devices, stream accounts) are persisted in PostgreSQL. If `DATABASE_URL` is not set, the service starts with in-memory stores (data is lost on restart) and auth/OAuth endpoints return `503`.

**User ownership** is enforced at the database layer — each watch, condition, device, and stream account has a `user_id` FK. Handlers pass the authenticated user's ID so each user sees only their own data.

**Poller cache** — the poller does not query the database on every poll cycle. Instead a `CachedWatchStore` holds an in-memory snapshot of active/live watches and refreshes it periodically (default every 5 minutes). `SetCurrentlyLive` writes through immediately; `UpdateLastChecked` only updates in-memory to minimise write traffic.

| Env var | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required for persistence) |
| `POLL_INTERVAL` | `5m` | How often the poller checks registered channels for stream start/end (e.g. `10m`, `15m`). Longer intervals reduce API quota consumption. |
| `CACHE_REFRESH_INTERVAL` | `5m` | How often the poller reloads active watches from DB (e.g. `2m`, `10m`) |

> ⚠️ `GOOGLE_REDIRECT_URL` has **no default**. If it is not set on the API server, OAuth will be disabled rather than silently using localhost.  
> The API reads `PORTAL_BASE_URL` (preferred) or `UI_BASE_URL` (legacy fallback) to know where to redirect after a successful OAuth login. `Secure` cookie flag is automatically set to `true` when `PORTAL_BASE_URL` starts with `https://`.

### Email+password endpoints
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register/send-verification-code` | `{ email, password, username, language }` | Initiates email verification flow for new account. `language` = one of "en", "ja", "de", "fr", "es", "zh", "ko" (optional, defaults to detecting from Accept-Language header). Generates 6-digit code, sends to email via HTML template in specified language (max 1 attempt per email per 30 seconds). Returns `{ status: "verification_required", verification_session_id: "...", expires_in: 3600 }` (1 hour TTL). Returns `409` if email already registered. Returns `400` for invalid email format, password too short, or unsupported language code. |
| POST | `/auth/register/verify-code` | `{ verification_session_id, code }` | Completes registration after email verification. Verifies 6-digit code against session. Creates `users` row with bcrypt hash if valid. Returns `{ status: "registered", user_id: "...", message: "Account created successfully" }`. Returns `400` if code is invalid. Returns `410` if verification_session_id expired. |
| POST | `/auth/login` | `{ identifier, password }` | `identifier` = username **or** email. Tries email first; falls back to username. Verifies bcrypt hash, creates session. |
| PATCH | `/auth/password` | `{ current_password, new_password }` | Change password. Requires `current_password` to match existing hash. Returns `200 OK` with `{"message": "Password updated successfully"}` on success. Returns `401` if `current_password` is wrong. Returns `400` if fields are missing or `new_password` is too short. Returns `409` if the account has no password yet (OAuth-only account). |

### Auth/user response shape

`GET /auth/user` returns the full account object including all connected login methods:

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "donuser",
  "picture": "https://...",
  "has_password": true,
  "connections": [
    {
      "provider": "google",
      "provider_email": "user@gmail.com",
      "provider_username": "Don Taucho",
      "provider_channel_name": "Don Taucho Channel",
      "connected_at": "2024-01-01T00:00:00Z"
    }
  ],
  "niconico": {
    "connected": true,
    "nico_user_id": "12345678",
    "nico_username": "どんたうこ",
    "nico_picture": "https://...",
    "connected_at": "2024-01-01T00:00:00Z"
  }
}
```

- `has_password` — `true` if the account has an email/password set; `false` for OAuth-only accounts.
- `connections` — array of linked OAuth providers (same shape as `GET /auth/connections`). Empty array `[]` when none.
- `niconico` — NicoNico connection status (same shape as `GET /niconico/status`). `{ "connected": false }` when not connected.

### Auth/connections endpoints
| Method | Path | Response | Description |
|--------|------|----------|-------------|
| GET | `/auth/connections` | `[{ provider, provider_email, provider_username, provider_channel_name, connected_at }]` | List linked OAuth providers. Fields `provider_email`, `provider_username`, `provider_channel_name` are nullable. Also included in `GET /auth/user` as `connections`. |
| DELETE | `/auth/connections/:provider` | `204` | Unlink provider. Returns `409` if this is the only remaining login method (i.e. `has_password` is false, no other OAuth connections, and NicoNico is not connected). |

---

## NicoNico Semi-OAuth (Session Proxy Login)

> **Why this exists:** Dwango/NicoNico's public OAuth program is closed to new developers. A corporate application is in progress. Until that OAuth credential is issued, this mechanism lets users connect their NicoNico account by entering their NicoNico email and password directly on the portal. The API logs in to NicoNico on their behalf and stores only the resulting session cookie. The password is used once and immediately discarded — it is never stored or logged.

### How it works

```
Portal (browser)               API (this server)          NicoNico
       │                              │                        │
       │  POST /api/niconico/login    │                        │
       │  { email, password } ───────►│                        │
       │                              │  GET login page ──────►│
       │                              │◄── HTML + CSRF token ──│
       │                              │  POST credentials ────►│
       │                              │◄── redirect + cookies ─│
       │                              │  (discard credentials) │
       │                              │  GET nvapi/v1/users/me►│
       │◄── { status, nico_username } │◄── user profile ───────│
       │     (session stored in DB)   │                        │
       │                              │                        │
       │  (later) GET /api/niconico/  │                        │
       │          status  ───────────►│  SELECT niconico_sess. │
       │◄── { connected: true, ... } │                        │
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/niconico/login` | Session cookie (required) | **Connect flow** — Step 1: link NicoNico to an already-authenticated portal account |
| `POST` | `/niconico/login/mfa` | Session cookie (required) | **Connect flow** — Step 2: submit 2FA OTP |
| `POST` | `/niconico/portal-login` | None (unauthenticated) | **Portal login/register** — Step 1: log in to the portal via NicoNico, or auto-create a portal account |
| `POST` | `/niconico/portal-login/mfa` | None (unauthenticated) | **Portal login/register** — Step 2: submit 2FA OTP |
| `GET` | `/niconico/status` | Session cookie | Check whether NicoNico is connected to the current portal account |
| `DELETE` | `/niconico/session` | Session cookie | Disconnect NicoNico (deletes stored session) |

**Authentication notes:**
- `/niconico/login` and `/niconico/login/mfa` — require an active portal session. The portal injects `X-User-ID`. Used **only** from the account-settings page (user already logged in, wants to link NicoNico).
- `/niconico/portal-login` and `/niconico/portal-login/mfa` — **no portal session required**. The API verifies NicoNico credentials, finds or creates the linked portal account, sets the portal session cookie, and returns `{ "status": "logged_in" }`. Used from login, register, and home page.

---

### `POST /niconico/login`

The portal calls this with the user's NicoNico credentials.

**Request body:**
```json
{ "email": "user@example.com", "password": "niconico_password" }
```

**Response — connected (`200`):**
```json
{
  "status": "connected",
  "nico_user_id": "12345678",
  "nico_username": "ニコ太郎",
  "nico_picture": "https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/0/1234567/large.jpg"
}
```

**Response — 2FA required (`200`):**
```json
{
  "status": "mfa_required",
  "mfa_session_id": "eyJhbGciO..."
}
```
The `mfa_session_id` is a server-side token valid for **10 minutes**. Show the OTP input immediately — do not let the user navigate away.

**Response — bad credentials (`401`):**
```json
{ "error": "NicoNico login failed: invalid NicoNico credentials" }
```

**Response — not authenticated with portal (`401`):**
```json
{ "error": "Not authenticated" }
```

---

### `POST /niconico/login/mfa`

Only called when the previous step returned `"status": "mfa_required"`.

**Request body:**
```json
{
  "mfa_session_id": "eyJhbGciO...",
  "otp": "123456"
}
```

**Response — connected (`200`):** same shape as a successful `/niconico/login`.

**Response — bad OTP (`401`):**
```json
{ "error": "OTP rejected: invalid OTP code" }
```

**Response — expired session (`400`):**
```json
{ "error": "MFA session expired or not found — please log in again" }
```

---

### `POST /niconico/portal-login`

> Unauthenticated — **no portal session required.** This endpoint logs the user in to the portal (or auto-creates a portal account) using NicoNico credentials. It is the NicoNico equivalent of `POST /auth/login`.

**Request body:**
```json
{ "email": "user@example.com", "password": "niconico_password" }
```

**Response — logged in (`200`):** API sets the portal session cookie and returns:
```json
{ "status": "logged_in" }
```

**Response — 2FA required (`200`):**
```json
{
  "status": "mfa_required",
  "mfa_session_id": "eyJhbGciO..."
}
```

**Response — bad credentials (`401`):**
```json
{ "error": "NicoNico login failed: invalid NicoNico credentials" }
```

---

### `POST /niconico/portal-login/mfa`

> Unauthenticated — no portal session required.

**Request body:**
```json
{
  "mfa_session_id": "eyJhbGciO...",
  "otp": "123456"
}
```

**Response — logged in (`200`):** same as a successful `/niconico/portal-login` — sets portal session cookie and returns `{ "status": "logged_in" }`.

**Response — bad OTP (`401`):**
```json
{ "error": "OTP rejected: invalid OTP code" }
```

**Response — expired/not found (`400`):**
```json
{ "error": "MFA session expired or not found — please log in again" }
```

---
### `GET /niconico/status`

**Response — connected (`200`):**
```json
{
  "connected": true,
  "nico_user_id": "12345678",
  "nico_username": "ニコ太郎",
  "nico_picture": "https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/...",
  "connected_at": "2026-06-01T10:00:00Z"
}
```

**Response — not connected (`200`):**
```json
{ "connected": false }
```

---

### `DELETE /niconico/session`

**Response: `204 No Content`**

---

### Portal Implementation Requirements

The portal is responsible for the entire login UX. The API handles only the HTTP session mechanics.

#### 1. Account Settings — "Connected Platforms" section

On the account settings page, show a "Connected Platforms" card (or extend the existing OAuth connections list). For NicoNico:

- On page load, call `GET /api/niconico/status`.
- **Not connected state:** show a "Connect NicoNico" button with the NicoNico logo.
- **Connected state:** show the user's NicoNico avatar (`nico_picture`), username (`nico_username`), and a "Disconnect" button.
- Cache the status response in component state — do not re-fetch on every render.

#### 2. NicoNico Login Modal

Triggered by the "Connect NicoNico" button. The modal has **two steps** that replace each other inline (no page navigation):

---

**Step 1 — Credential form**

```
┌───────────────────────────────────────────┐
│  🔴 Connect NicoNico                  ✕   │
│                                           │
│  ⚠️  Your password is used once to        │
│  obtain a login session and is never      │
│  stored. This is a temporary measure      │
│  while official OAuth is pending.         │
│                                           │
│  NicoNico email / phone                   │
│  ┌─────────────────────────────────────┐  │
│  │ user@example.com                    │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  Password                                 │
│  ┌─────────────────────────────────────┐  │
│  │ ••••••••                        👁  │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [ Cancel ]        [ Connect NicoNico → ] │
└───────────────────────────────────────────┘
```

- Both fields required; validate client-side before submitting.
- "Connect NicoNico" button shows a spinner while the request is in flight (`POST /api/niconico/login`).
- On `{ "status": "connected" }` → close modal, refresh status, show success toast.
- On `{ "status": "mfa_required" }` → transition to Step 2 (keep `mfa_session_id` in component state).
- On error → show the error message inline below the form; keep the form filled so the user can correct it.

**Step 2 — 2FA / OTP input** *(only shown when Step 1 returns `mfa_required`)*

```
┌───────────────────────────────────────────┐
│  🔴 NicoNico Two-Factor Auth          ✕   │
│                                           │
│  Enter the 6-digit code from your         │
│  authenticator app or SMS.                │
│                                           │
│  One-time code                            │
│  ┌────────────────────┐                   │
│  │  1 2 3 · · ·       │  ⏳ 9:42 left    │
│  └────────────────────┘                   │
│                                           │
│  [ ← Back ]          [ Verify & Connect ] │
└───────────────────────────────────────────┘
```

- Show a **countdown timer** from 10:00 down to 0:00 (the `mfa_session_id` is valid 10 minutes server-side).
- When the timer hits 0, disable the submit button and show "Session expired — please start over" with a "Try again" link that resets to Step 1.
- OTP field: `<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code">` — this triggers the SMS OTP auto-fill on iOS/Android.
- Submit calls `POST /api/niconico/login/mfa` with `{ mfa_session_id, otp }`.
- On `{ "status": "connected" }` → close modal, refresh status, show success toast.
- On `401` (bad OTP) → show error, clear the OTP field, let user try again (server discards the pending entry on failure — Step 1 must be restarted).
- On `400` (expired session) → show "Session expired" and reset to Step 1.
- "← Back" button resets to Step 1 (the user might have entered the wrong email).

#### 3. Privacy Disclaimer

The privacy note is shown in Step 1 of the modal (see wireframe above). It must be visible before the user types their password. Suggested wording:

> Your NicoNico email and password are sent directly to the Taucho API server over HTTPS. They are used once to obtain a session token and are immediately discarded — your password is never stored or logged. Your session token is stored encrypted and used to fetch live stream data on your behalf.

#### 4. Disconnect flow

From the connected state in Account Settings:

1. Show a confirmation dialog: *"Disconnect NicoNico? Live stream monitoring for NicoNico channels will stop."*
2. On confirm → `DELETE /api/niconico/session`.
3. On `204` → update UI to "not connected" state.

#### 5. State machine (component-level)

```
idle
 │
 ├─[open modal]──► step1_form
 │                    │
 │          [submit credentials]
 │                    │
 │              ┌─────┴────────────────────────┐
 │              │                              │
 │          loading_login               error_login
 │              │                              │
 │         ┌────┴───────────────┐         [retry]
 │         │                   │
 │     connected           step2_mfa
 │         │                   │
 │     [modal closes]     [submit otp]
 │                             │
 │                        ┌────┴────────────┐
 │                         │               │
 │                     connected     error_otp
 │                         │               │
 │                     [modal closes]  [retry / back]
 │
 └─[connected state]──► disconnect_confirm ──► idle
```

Implement this as a single `niconico_connect_status` state variable (or a Zustand/Pinia slice) so any component on the page can react to connection changes.

#### 6. Error messages (user-facing copy)

| API error | Displayed message |
|-----------|-------------------|
| `invalid NicoNico credentials` | "Incorrect email or password. Please check your NicoNico login details." |
| `invalid OTP code` | "That code is incorrect. Please check your authenticator app and try again." |
| `MFA session expired` | "The session timed out. Please start over." |
| `no user_session cookie` | "NicoNico blocked the login attempt. Please try again in a few minutes." |
| Network / 5xx | "Could not reach the server. Please check your connection and try again." |

#### 7. Where to show NicoNico connection status elsewhere

- **Watches page:** if a NicoNico watch exists but the session is disconnected, show an inline warning badge: *"NicoNico not connected — live detection paused."* Link to Account Settings.
- **Account Settings connections list:** NicoNico should appear alongside Google/Twitch in the "Connected Platforms" list, using `connected_at` as "Connected since".

---

## URL Routing Note

The portal proxy strips exactly one `/api` prefix before forwarding:

| Portal JS calls | API server receives |
|---|---|
| `/api/auth/user` | `/auth/user` |
| `/api/watches` | `/watches` |
| `/api/devices` | `/devices` |

**Recommendation:** API server routes should **not** include a leading `/api` prefix.  
If your current watch/stream-event handlers are registered at `/api/watches/...`, the portal
would have to call `/api/api/watches/...` (double prefix) — which is wrong.  
Either register them at `/watches/...` on the API server, or change the proxy strip target.

---

## ✅ Fully Implemented

### Auth & Session (`/auth/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/user` | Get current user profile |
| PATCH | `/auth/user` | Update `username` and/or `picture` (fields optional) |
| PATCH | `/auth/password` | Change password: `{ current_password, new_password }`. Returns `409` for OAuth-only accounts. |
| DELETE | `/auth/user` | Delete account + clear session cookie |
| POST | `/auth/login` | Email/username + password login, sets session cookie |
| POST | `/auth/register` | Create new email+password account |
| POST | `/auth/logout` | Log out, clear session |
| GET | `/oauth/login?provider=<p>` | Start OAuth login — returns `{ auth_url }`. `p` = `google`, `twitch`, `instagram`, `facebook`, `tiktok`, `kick`, `x`, or `bilibili`. After OAuth callback, always redirects to `{PORTAL_BASE_URL}/dashboard` (`return_url` is not yet implemented). |
| GET | `/auth/callback/google` | Google OAuth callback (proxied by portal) |
| GET | `/auth/callback/twitch` | Twitch OAuth callback (proxied by portal) |
| GET | `/auth/callback/instagram` | Instagram OAuth callback (proxied by portal) |
| GET | `/auth/callback/facebook` | Facebook OAuth callback (proxied by portal) |
| GET | `/auth/callback/tiktok` | TikTok OAuth callback (proxied by portal) |
| GET | `/auth/callback/kick` | Kick OAuth callback (proxied by portal) |
| GET | `/auth/callback/x` | X OAuth callback (proxied by portal) |
| GET | `/auth/callback/bilibili` | Bilibili OAuth callback (proxied by portal) |
| GET | `/auth/connections` | List all OAuth providers linked to the current account |
| DELETE | `/auth/connections/:provider` | Unlink an OAuth provider from the current account |


### Watched Channels (`/watches/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/watches` | List all watches for the authenticated user |
| GET | `/watches/get?id=<id>` | Get a single watch |
| POST | `/watches` | Create a new watched channel |
| PATCH | `/watches/update?id=<id>` | Update `name`, `is_active`, and/or `stream_filter` |
| DELETE | `/watches?id=<id>` | Delete a watch (also removes its conditions) |

**WatchTarget object fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID |
| `name` | string | Human-readable channel name |
| `platform` | string | `"youtube"`, `"twitch"`, `"niconico"` |
| `channel_id` | string | Platform channel identifier |
| `is_active` | bool | Whether polling is enabled |
| `status` | string | `"live"`, `"offline"`, `"paused"` |
| `thumbnail` | string (URL) | Channel thumbnail image URL (nullable) |
| `stream_filter` | object\|null | Optional filter — see below |
| `last_stream_at` | timestamp | When we last detected a live stream |

**`stream_filter` — per-watch stream tracking filter**

Controls whether a detected live stream should actually be tracked and trigger conditions/device actions. All comparisons are **case-insensitive substring** matches. `null` or omitted means track all streams.

```json
{
  "skip_if_title_contains": ["just a test", "テスト配信", "draft"],
  "skip_if_description_contains": ["do not track"],
  "require_title_contains": ["live", "配信"]
}
```

| Field | Type | Behaviour |
|-------|------|-----------|
| `skip_if_title_contains` | `string[]` | Skip stream if title contains **any** entry (blacklist) |
| `skip_if_description_contains` | `string[]` | Skip stream if description contains **any** entry (blacklist) |
| `require_title_contains` | `string[]` | Only track stream if title contains **at least one** entry (whitelist); empty = no restriction |

Evaluation order: whitelist check first, then blacklist checks. A stream is tracked only when all checks pass.

> **Filter + polling interaction:** When a stream is detected but does **not** pass the filter, the watch target is still marked as `is_currently_live = true` internally. This prevents the poller from hitting the platform API on every cycle for a stream that will always be filtered. The stream is recorded in the database with status `"filtered"`. When the stream ends, the live flag is cleared and the status becomes `"filtered_ended"`. The watcher is **not** notified for filtered streams — no conditions are evaluated and no device actions fire. The portal can show status `"live"` for these (the channel is live, just not being tracked).

**`POST /watches` request body:**
```json
{
  "name": "My Channel",
  "platform": "youtube",
  "channel_id": "UCxxxxxxxx",
  "is_active": true,
  "stream_filter": {
    "skip_if_title_contains": ["just a test"]
  }
}
```

**`PATCH /watches/update?id=<id>` request body** (all fields optional):
```json
{
  "name": "New Name",
  "is_active": true,
  "stream_filter": { "skip_if_title_contains": ["test"] },
  "clear_filter": false
}
```
Set `"clear_filter": true` to remove the filter entirely (resetting to track-all behaviour).

### Stream Events (`/stream-events/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stream-events` | List events for user (`?limit=N`, `?watch_id=<id>`) |
| GET | `/stream-events/get?id=<id>` | Get a single stream event |

**Stream event `status` values:**

| Status | Meaning |
|--------|---------|
| `live` | Stream is currently active |
| `ended` | Stream ended normally; watcher was notified |
| `scheduled` | Detected as a future/scheduled broadcast |
| `filtered` | Stream was detected but skipped by the watch's `stream_filter` (still live) |
| `filtered_ended` | Filtered stream has now ended |

### Conditions (`/conditions/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/conditions?watch_id=<id>` | List all conditions for a watched channel |
| GET | `/conditions/get?id=<id>` | Get a single condition |
| POST | `/conditions` | Create a condition |
| PATCH | `/conditions/update?id=<id>` | Update a condition |
| DELETE | `/conditions?id=<id>` | Delete a condition |
| POST | `/conditions/test-draft` | Test unsaved condition logic *(new)* |
| POST | `/conditions/{id}/test` | Test existing condition *(new)* |
| POST | `/conditions/test-all` | Test all user conditions *(new)* |

**See `/docs/condition-logic-api.md` for detailed documentation on the condition logic structure and testing endpoints.**

### Devices (`/devices/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all devices (credentials omitted) |
| GET | `/devices/get?id=<id>` | Get a single device (includes credentials) |
| POST | `/devices` | Register a device |
| PATCH | `/devices/update?id=<id>` | Update a device |
| DELETE | `/devices?id=<id>` | Delete a device |
| POST | `/devices/test?id=<id>` | **Send a test command to device using template system** |

**Device test endpoint** (`POST /devices/test?id=<id>`):
- ✅ **NOW FULLY FUNCTIONAL** — calls actual device APIs
- Requires credentials to be set up for the device's brand
- Uses template system to construct HTTP request
- Returns success/failure with detailed error info
- Body: `{ "template_id": <int>, "action": "<string>", "params": <object> }`

### Device Credentials (`/device-credentials/...`) ⭐ NEW
| Method | Path | Description |
|--------|------|-------------|
| GET | `/device-credentials` | List all credentials for current user (masked) |
| GET | `/device-credentials/get?id=<id>` | Get a single credential (without sensitive fields) |
| POST | `/device-credentials` | Create a new credential for a device brand |
| PATCH | `/device-credentials/update?id=<id>` | Update an existing credential |
| DELETE | `/device-credentials?id=<id>` | Delete a credential |

**Credential fields by brand:**
- **Govee**: `api_key`, `device_id`
- **LIFX**: `bearer_token`
- **Philips Hue**: `bearer_token`, `host_ip`, `port`
- **WLED**: `host_ip`, `port`
- **Nanoleaf**: `api_key`, `host_ip`, `port`
- **TP-Link Kasa**: `username`, `password`, `host_ip`, `port`
- **Tuya**: `api_key`, `bearer_token`, `device_id`, `region`
- **Wyze**: `username`, `password`
- **Yeelight**: `host_ip`, `port`

**Request body for `POST /device-credentials`:**
```json
{
  "brand_name": "govee",
  "api_key": "your-api-key",
  "device_id": "device-123",
  "device_name": "Living Room Light",
  "device_model": "H6199"
}
```

**Security:** All sensitive fields (API keys, tokens, passwords) are masked in API responses (e.g., `****3k9x`).

### Device Templates (`/device-templates/...`) ⭐ NEW
| Method | Path | Description |
|--------|------|-------------|
| GET | `/device-templates` | List all templates (supports `?brand=` and `?category=` filters) |
| GET | `/device-templates/get?id=<id>` | Get a single template |

**Template object includes:**
- Brand name, category (power, brightness, color, etc.)
- HTTP method and URL endpoint pattern
- Body template with parameter placeholders
- Authentication type (api_key, bearer_token, oauth, none)
- Required and optional parameters with constraints
- UI hints and examples

**Example usage:**
```bash
# List templates for Govee
GET /device-templates?brand=govee

# List templates for brightness control
GET /device-templates?category=brightness

# Get specific template
GET /device-templates/get?id=123
```

### Device Groups (`/device-groups/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/device-groups` | List all device groups for current user |
| GET | `/device-groups/get?id=<id>` | Get a single device group with all its devices |
| POST | `/device-groups` | Create a new device group |
| PATCH | `/device-groups/update?id=<id>` | Update a device group name or option |
| DELETE | `/device-groups?id=<id>` | Delete a device group (devices remain unassigned) |
| POST | `/device-groups/assign?device_id=<id>&group_id=<id>` | Assign a device to a device group |
| POST | `/device-groups/remove?device_id=<id>` | Remove a device from its device group |

**Device Group data model:**
```json
{
  "id": "string (format: group_<timestamp_nanos>)",
  "user_id": "integer (FK → users.id, CASCADE DELETE)",
  "name": "string (human-readable group name)",
  "option": "string (sequential | queue)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Option values:**
- `"sequential"` — "cracker popper" behavior; devices trigger one after another
- `"queue"` — queue-based behavior; each device serves an audience until exhausted, then moves to next device

**Request body for `POST /device-groups`:**
```json
{
  "name": "Living Room Lights",
  "option": "sequential"
}
```

**Request body for `PATCH /device-groups/update?id=<id>` (all optional):**
```json
{
  "name": "Updated Name",
  "option": "queue"
}
```

**Response for `GET /device-groups/get?id=<id>` includes nested devices:**
```json
{
  "id": "group_1718237456000000000",
  "user_id": 42,
  "name": "Living Room Lights",
  "option": "sequential",
  "devices": [
    {
      "id": "device_1",
      "user_id": 42,
      "name": "Light 1",
      "brand": "hue",
      "product_id": "hue-color-bulb",
      "room": "living_room",
      "is_configured": true,
      "status": "online",
      "device_group_id": "group_1718237456000000000",
      "created_at": "2024-06-12T22:00:00Z",
      "updated_at": "2024-06-12T22:14:07Z"
    }
  ],
  "created_at": "2024-06-12T22:14:07Z",
  "updated_at": "2024-06-12T22:14:07Z"
}
```

**Security notes:**
- Device groups are scoped to individual users — a user cannot view, modify, or delete another user's groups
- A device can belong to at most one group at a time
- Assigning a device to a new group automatically removes it from its previous group
- Deleting a group does NOT delete its devices — only removes the group reference

**See `/docs/DEVICE_GROUPING.md` for detailed documentation on device grouping, including usage examples and future enhancement roadmap.**

### Stream Accounts (`/streams/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/streams` | List all stream accounts (`stream_key` masked) |
| GET | `/streams/get?id=<id>` | Get full stream account (includes `stream_key`) |
| POST | `/streams` | Register a stream account |
| PATCH | `/streams/update?id=<id>` | Update a stream account |
| DELETE | `/streams?id=<id>` | Delete a stream account |

### Poller Control (`/poller/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/poller/status` | Check poller status |
| POST | `/poller/start` | Start poller |
| POST | `/poller/stop` | Stop poller |

---

## Platform Channel Discovery ✅

Used by the **Add Channel** page (`/add-channel`) to browse and search real channels.  
Most endpoints rely on linked OAuth tokens (refreshed automatically). **Kick and Bilibili search, and Twitch search, do not require a linked account** — they use public or app-level APIs.

> **Implementation note:** Tokens are stored in the `oauth_accounts` table (`access_token`, `refresh_token`, `token_expires_at` columns added via migration). The `YOUTUBE_API_KEY` environment variable is required for the YouTube search endpoint. NicoNico channel discovery uses the session cookie from `niconico_sessions` (not an OAuth token). NicoNico search uses the **public** NicoNico live content search API (`api.search.nicovideo.jp`) — no authentication required; results are deduplicated live broadcast entries. Twitch search uses the user's linked token when available, and falls back to a Twitch app access token (client credentials) when not, so it works even without a linked Twitch account. Kick search currently returns `501` — the informal public API is no longer available and the official Kick API requires OAuth. Bilibili search is geo-restricted from non-Japanese IPs (returns `412`); the production server in Japan handles it correctly.

### YouTube (`/platform/youtube/...`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/youtube/channels/mine` | Own YouTube channel(s) |
| GET | `/platform/youtube/subscriptions?page_token=` | Paginated subscription list |
| GET | `/platform/youtube/search?q=` | Channel search (uses YouTube Data API key, not user OAuth) |

**`GET /platform/youtube/channels/mine`**  
Response: array of channel objects
```json
[
  {
    "channel_id": "UCxxxxxxxx",
    "title": "My Channel",
    "thumbnail": "https://...",
    "subscriber_count": 12345
  }
]
```

**`GET /platform/youtube/subscriptions?page_token=`**  
Response:
```json
{
  "items": [
    { "channel_id": "UCxxxxxxxx", "title": "...", "thumbnail": "...", "subscriber_count": 0 }
  ],
  "next_page_token": "CG8Qaa..." 
}
```
- `next_page_token` is omitted or `null` when there is no further page.

**`GET /platform/youtube/search?q=`**  
- Uses YouTube Data API key (server-side), not user OAuth.  
- Response: same shape as subscriptions (`{ items: [...], next_page_token: "..." }`).

---

### Twitch (`/platform/twitch/...`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/twitch/channels/mine` | Own Twitch channel |
| GET | `/platform/twitch/following?cursor=` | Paginated channels-followed list |
| GET | `/platform/twitch/search?q=` | Channel search |

**`GET /platform/twitch/channels/mine`**  
Response: array (usually one item):
```json
[
  {
    "channel_id": "1234567",
    "display_name": "MyTwitchName",
    "thumbnail": "https://...",
    "follower_count": 500,
    "is_live": false
  }
]
```

**`GET /platform/twitch/following?cursor=`**  
Response:
```json
{
  "items": [
    { "channel_id": "987654", "display_name": "...", "thumbnail": "...", "follower_count": 0, "is_live": true }
  ],
  "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ=="
}
```
- `cursor` is omitted or `null` on last page.
- Requires `user:read:follows` OAuth scope. If scope is missing, respond with `403 Forbidden`.

**`GET /platform/twitch/search?q=`**  
- Does **not** require a linked Twitch account — uses the user's linked token if available, otherwise falls back to a Twitch app access token (client credentials).
- Response: same shape as following (`{ items: [...], cursor: "..." }`).

---

### NicoNico (`/platform/niconico/...`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/niconico/channels/mine` | NicoNico user channel info |
| GET | `/platform/niconico/search?q=` | Live broadcast search (public NicoNico search API) |

**`GET /platform/niconico/channels/mine`**  
Response: array (usually one item):
```json
[
  {
    "channel_id": "user/12345678",
    "title": "My NicoNico",
    "thumbnail": "https://...",
    "follower_count": 200
  }
]
```

**`GET /platform/niconico/search?q=`**  
- Does **not** require a linked NicoNico account — uses the public NicoNico live content search API.  
- Results are **deduplicated by channel identity**: only the most-viewed broadcast per channel is returned.  
- The `title` field is the **broadcast title**, not the channel/user display name (limitation of the NicoNico search API — no channel-name search is available publicly).  
- May return `502` if the upstream NicoNico search API is unreachable.  
- The API is accessible only from Japan; non-Japanese IPs may receive a `403` from NicoNico's CDN. The production server handles this correctly.  

Response: array of search result objects:
```json
[
  {
    "channel_id": "co123456",
    "title": "Broadcast title here",
    "thumbnail": "https://...",
    "is_live": true,
    "viewer_count": 1234,
    "provider_type": "community"
  }
]
```

**`channel_id` format by `provider_type`:**

| `provider_type` | `channel_id` format | Description |
|-----------------|---------------------|-------------|
| `community` | `co123456` | Personal community stream (most common) |
| `channel` | `ch1234` | Paid official channel (e.g. anime/publisher channels) |
| `official` | `user/{userId}` | NicoNico official content |

> When creating a watch target for a NicoNico channel, use the `channel_id` exactly as returned by this endpoint. The prefix (`co`, `ch`, or `user/`) identifies the broadcaster type and is used by the NicoNico poller.

---

### Instagram (`/platform/instagram/...`)

Instagram Live events are accessible via the Meta Graph API with user OAuth token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/instagram/user/mine` | Own Instagram Business account |
| GET | `/platform/instagram/search?q=` | User search (via Meta Graph API) |

**`GET /platform/instagram/user/mine`**  
Response: object with Instagram account info
```json
{
  "user_id": "17841401234567890",
  "username": "my_ig_handle",
  "display_name": "My Display Name",
  "thumbnail": "https://...",
  "follower_count": 5000
}
```

**`GET /platform/instagram/search?q=`**  
Response: array of user objects (same shape as above):
```json
{
  "items": [
    { "user_id": "...", "username": "...", "display_name": "...", "thumbnail": "...", "follower_count": 0 }
  ]
}
```

---

### Facebook (`/platform/facebook/...`)

Facebook Live events are accessible via the Meta Graph API with user OAuth token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/facebook/page/mine` | Own Facebook page(s) |
| GET | `/platform/facebook/search?q=` | Page search (via Meta Graph API) |
| GET | `/platform/facebook/live?page_id=` | Live streams for a page |

**`GET /platform/facebook/page/mine`**  
Response: array of page objects
```json
[
  {
    "page_id": "1234567890",
    "name": "My Page",
    "thumbnail": "https://..."
  }
]
```

**`GET /platform/facebook/search?q=`**  
Response: object with array of page objects
```json
{
  "items": [
    { "page_id": "...", "name": "...", "thumbnail": "..." }
  ]
}
```

**`GET /platform/facebook/live?page_id=<id>`**  
Returns live streams for a Facebook page.
Response: object with array of live stream objects
```json
{
  "items": [
    {
      "stream_id": "123456789",
      "title": "Live Stream Title",
      "description": "Stream description",
      "live_status": "LIVE",
      "permalink": "https://facebook.com/...",
      "thumbnail": "https://...",
      "started_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

### TikTok (`/platform/tiktok/...`)

TikTok Live events are accessible via the TikTok Open API with user OAuth token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/tiktok/user/mine` | Own TikTok account |
| GET | `/platform/tiktok/search?q=` | Creator search (via TikTok Open API) |

**`GET /platform/tiktok/user/mine`**  
Response: object with TikTok account info
```json
{
  "user_id": "6987123456789012345",
  "username": "my_tiktok_handle",
  "display_name": "My TikTok Name",
  "thumbnail": "https://...",
  "follower_count": 50000
}
```

**`GET /platform/tiktok/search?q=`**  
Response: array of creator objects (same shape as above).

---

### X / Twitter (`/platform/x/...`)

X (formerly Twitter) Live events are accessible via the X API v2 with user OAuth token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/x/user/mine` | Own X account |
| GET | `/platform/x/search?q=` | User search (via X API v2) |

**`GET /platform/x/user/mine`**  
Response: object with X account info
```json
{
  "user_id": "1234567890",
  "username": "my_x_handle",
  "display_name": "My X Name",
  "thumbnail": "https://...",
  "follower_count": 100000
}
```

**`GET /platform/x/search?q=`**  
Response: array of user objects (same shape as above).

---

### Kick (`/platform/kick/...`)

Kick live chat is monitored via **polling** (not real-time WebSocket). The Kick Pusher app key is disabled/rate-limited, so the listener uses REST API polling every 5 seconds to detect stream activity.

#### Real-time Event Limitations
- **Supported:** Stream going live/offline, viewer count changes
- **Not supported:** Individual message content, message sender identification, gift type differentiation
- **Delay:** ~5-10 second delay (not real-time)

This means Kick watch conditions can trigger on:
- `"Stream has activity"` — detects when viewer count changes significantly (±5 viewers)
- `"Stream is live"` — detects stream start

But conditions requiring message content (e.g., "Someone sent a gift", "Comment contains text") will not work on Kick.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/kick/search?q=` | Channel search — currently returns `501` (Kick's public API is unavailable) |
| GET | `/platform/kick/channels/mine` | Own Kick channel (requires OAuth — not yet implemented) |
| GET | `/platform/kick/following?cursor=` | Channels you follow (requires OAuth — not yet implemented) |

**`GET /platform/kick/search?q=`**
- Always returns `501 Not Implemented`.
- The unofficial Kick public search API is no longer operational.
- Once Kick OAuth is implemented, this endpoint can be wired to the official Kick API.
- **Portal note:** Do not show a free-text search form for Kick — searching is unavailable regardless of login state.

**Listener Technical Notes:**
- Uses REST API polling (no credentials required)
- Polls every 5 seconds via `https://kick.com/api/v1/channels/{slug}`
- Detects viewer count deltas (±5 viewer threshold for triggering activity)
- Suitable for use-case: "Trigger device when stream goes live or viewer count spikes"
- Not suitable for: Message-specific triggers, gift/subscription detection, comment filtering
- Can be upgraded to WebSocket if/when Kick provides a working Pusher app key

---

### Bilibili (`/platform/bilibili/...`)

Bilibili live chat is readable via public WebSocket with `uid: 0` — no user login required.
Channel search uses the public Bilibili search API.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/bilibili/search?q=` | Channel / space search (no auth required) |
| GET | `/platform/bilibili/channels/mine` | Own space info (requires login — not yet implemented) |
| GET | `/platform/bilibili/following?cursor=` | Followed spaces (requires login — not yet implemented) |

**`GET /platform/bilibili/search?q=`**
- Does **not** require user authentication.
- `channel_id` is the numeric UID of the Bilibili space (e.g. `"12345678"`).
- Returns `502` if the upstream Bilibili API is unreachable.
- **Geo-restriction:** Bilibili's search API returns `412 Request was banned` from non-Chinese/non-Japanese IPs. The production server (Japan) handles this correctly; local development from outside Japan will receive errors.
- Response:
```json
{
  "items": [
    {
      "channel_id": "12345678",
      "title": "Channel Name",
      "thumbnail": "https://...",
      "follower_count": 100000
    }
  ]
}
```

---



| Status | Meaning |
|--------|---------|
| 401 | Not authenticated |
| 403 | OAuth scope insufficient (e.g. Twitch `user:read:follows` missing) |
| 404 | User has no linked account for this platform |
| 501 | Endpoint not yet implemented |
| 502 | Upstream platform API error |

<!-- Keeping the original endpoint schemas below for reference -->

### Watched Channels — full CRUD (`/watches/...`)

> **🔒 Authorization Required:** All endpoints in this section require authentication via `X-User-ID` header. The API verifies that the authenticated user owns each resource before allowing access. Attempting to access another user's watch, device, or condition will return `403 Forbidden`.

The **Watched Channels** page (`/monitors`) lists all channels the polling service monitors.  
Each channel has per-platform event conditions (see Conditions below).

**Watch object:**
```json
{
  "id": "string (nano-time ID, e.g. \"watch_1748500000000\")",
  "user_id": "integer",
  "name": "string",
  "platform": "youtube | twitch | niconico | instagram | tiktok | kick | facebook | x | bilibili",
  "channel_id": "string",
  "is_active": true,
  "status": "live | offline | paused",
  "thumbnail_url": "string | null (Channel thumbnail image URL)",
  "last_stream_at": "2026-05-25T14:00:00Z"
}
```

#### Watches — Thumbnail Management

**Auto-fetching (if available):**
When a watch is created (`POST /watches`), the API automatically fetches the channel's thumbnail from the platform provider. Works for:
- ✅ YouTube: Channel profile picture
- ✅ Twitch: Channel profile image  
- ❌ NicoNico: Not yet supported (returns `null`)
- ❌ Other platforms: May not be available

**Manual thumbnail URL (for platforms without auto-fetch):**
If auto-fetch fails or the provider doesn't support it, the frontend can provide the thumbnail URL directly:

```bash
POST /watches
{
  "name": "Channel Name",
  "platform": "niconico",
  "channel_id": "co1234567",
  "is_active": true,
  "thumbnail_url": "https://example.com/image.jpg"  # Optional — if you have the URL
}
```

**Update thumbnail after creation:**
```bash
PATCH /watches/update?id=watch_123
{
  "thumbnail_url": "https://example.com/new-image.jpg"  # Set new URL
}
```

**Clear thumbnail:**
```bash
PATCH /watches/update?id=watch_123
{
  "clear_thumbnail": true  # Explicitly set to NULL
}
```

**Field details:**
- **thumbnail_url**: nullable, automatically populated if provider supports it
- **Frontend usage**: Use directly in `<img>` tags (no server proxying needed)
- **Null behavior**: If not provided and auto-fetch fails, remains `null` in database (no error)

#### Watches — Channel Access Validation (NEW)

**Purpose:** Test if backend can access a channel **before** creating a watch.

This prevents the "silent failure" scenario where:
1. User creates watch for channel X on frontend
2. Frontend shows success (no error)
3. Backend silently fails to fetch events with 401/403
4. User doesn't realize their watch isn't working

**When to call:**
- **Before** `POST /watches` is called
- After user selects a platform and enters channel ID
- Show validation result to user before allowing watch creation

**Request:**
```json
{
  "platform": "twitcasting",
  "channel_id": "c:bandan"
}
```

**Response — success (`200`):**
```json
{
  "is_accessible": true,
  "message": "Backend can access this TwitCasting channel: ユーザー名"
}
```

**Response — failure (`200` with error details):**
```json
{
  "is_accessible": false,
  "error": "TwitCasting API returned 401 Unauthorized",
  "account_type": "regular (non-c prefix)",
  "suggestion": "Your TwitCasting account may not have API access. Try using a c: prefix account (bot/creator account) instead. Or check if you need to OAuth login again with your account."
}
```

**Response — platform not supported (`200`):**
```json
{
  "is_accessible": false,
  "error": "Platform \"myplatform\" not supported"
}
```

**Key fields:**
- **is_accessible**: Boolean — whether backend can access this channel
- **message**: Human-readable success message (only if `is_accessible: true`)
- **error**: Technical error message (only if `is_accessible: false`)
- **account_type**: Platform-specific account information (e.g., "c_prefix" vs "regular" for TwitCasting)
- **suggestion**: How to fix the issue (e.g., "Try using a different account type")

**Per-user OAuth tokens:**
The validation endpoint uses the user's OAuth token **if they've authenticated with that platform**. For example:
- If user OAuth-logged in with TwitCasting, their token is used
- If user has only set a static/shared token, that is used
- If neither exists, validation fails

This means **each user can use their own platform account** without interfering with others.

**Frontend integration example:**

```javascript
async function validateChannelThenCreate() {
  const platform = 'twitcasting';
  const channelId = 'c:bandan';
  
  // 1. Validate access first
  const validation = await fetch('/watches/validate-channel-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, channel_id: channelId })
  }).then(r => r.json());
  
  if (!validation.is_accessible) {
    // Show error to user
    showError(validation.error);
    if (validation.suggestion) {
      showInfo(validation.suggestion);
    }
    return; // Block watch creation
  }
  
  // 2. Validation passed — now create watch
  const watch = await fetch('/watches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My Channel',
      platform,
      channel_id: channelId,
      is_active: true
    })
  }).then(r => r.json());
  
  showSuccess(`Watch created: ${watch.name}`);
}
```

---

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/watches` | — | List all watches for the authenticated user |
| POST | `/watches/validate-channel-access` | `{ platform, channel_id }` | **[NEW]** Test if backend can access a channel before creating watch |
| POST | `/watches` | `{ name, platform, channel_id, is_active, [thumbnail_url] }` | Create a new watched channel (thumbnail optional) |
| PATCH | `/watches/update?id=<id>` | `{ [thumbnail_url], [clear_thumbnail] }` | Update thumbnail for a watch |
| DELETE | `/watches?id=<id>` | — | Delete a watch (also removes its conditions) |

> `GET /watches/get` already exists.

---

### Conditions (`/conditions/...`)

> **🔒 Authorization Required:** All endpoints in this section require authentication via `X-User-ID` header. The API verifies that the authenticated user owns the watch associated with each condition before allowing access. Attempting to access another user's condition will return `403 Forbidden`.

Conditions belong to a watched channel. When the API polling service detects a matching
stream event, it can trigger a device action.

**Condition object:**
```json
{
  "id": "string (nano-time ID, e.g. \"cond_1748500000000\")",
  "watch_id": "string (FK → watches.id)",
  "name": "string",
  "event_type": "comment | superchat | sticker | member | follow | sub | cheer | gift | nicoru | hype_train | raid | stream_start | stream_end",
  "filter": "string (optional keyword; empty = match all)",
  "condition_logic": { "Operator": "...", "SubConditions": [...], "Variables": [...] },
  "is_enabled": true,
  "device_id": "string | null (FK → devices.id)",
  "device_action": "on | off | toggle | color | brightness | color_temp | scene | flash | null",
  
  "device_action_params": {
    "color": "#ff0000",
    "brightness": 75
  },
  
  "device_action_body": {
    "state": "on",
    "brightness": 50,
    "color": "#ffffff",
    "transition_ms": 300
  },
  "device_action_param_name": "brightness",
  "device_action_param_evaluator": {
    "Operator": "PARAM",
    "Variables": ["75"]
  },
  
  "last_triggered_at": "2026-05-25T14:08:00Z | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Legacy vs New Parameter System:**
- **Legacy (backward compat):** Use only `device_action_params` — a single ConditionLogicStructure that evaluates to a single value
- **New (recommended):** Use `device_action_body` + `device_action_param_name` + `device_action_param_evaluator` to send complete device request bodies
  - `device_action_body`: Template of the entire request body (JSON object)
  - `device_action_param_name`: Which field in the template to replace with evaluated value
  - `device_action_param_evaluator`: Logic to compute the value to inject

**When using the new system:**
- Provide all three fields (`device_action_body`, `device_action_param_name`, `device_action_param_evaluator`)
- `device_action_param_name` must exist as a key in `device_action_body`
- Cannot mix legacy and new systems (will return `400 Bad Request`)

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/conditions?watch_id=<id>` | — | List all conditions for a watched channel |
| GET | `/conditions/get?id=<id>` | — | Get a single condition |
| POST | `/conditions` | `{ watch_id, name, event_type, filter?, condition_logic?, is_enabled, device_id?, device_action?, device_action_params?, device_action_body?, device_action_param_name?, device_action_param_evaluator? }` | Create a condition |
| PATCH | `/conditions/update?id=<id>` | any subset of `{ name, event_type, filter, condition_logic, is_enabled, device_id, device_action, device_action_params, device_action_body, device_action_param_name, device_action_param_evaluator }` | Update a condition |
| DELETE | `/conditions?id=<id>` | — | Delete a condition |

**Platform-specific event types the portal uses:**

> **Note:** The table below lists event types the portal may display for each platform. For conditions, only types in the `ValidEventTypes` set are accepted as triggers: `comment`, `superchat`, `sticker`, `member`, `follow`, `sub`, `cheer`, `gift`, `nicoru`, `hype_train`, `raid`, `stream_start`, `stream_end`. Event types `like`, `reaction`, and `viewer_join` are received and stored as live events but cannot currently be used as condition triggers.

| Platform | Condition-triggerable event types |
|----------|-------------|
| YouTube | `comment`, `superchat`, `sticker`, `member`, `stream_start`, `stream_end` |
| Twitch | `comment`, `cheer`, `follow`, `sub`, `hype_train`, `raid`, `stream_start`, `stream_end` |
| NicoNico | `comment`, `nicoru`, `gift`, `follow`, `stream_start`, `stream_end` |
| Instagram | `comment`, `follow`, `gift`, `stream_start`, `stream_end` |
| TikTok | `comment`, `follow`, `gift`, `stream_start`, `stream_end` |
| Kick | `comment`, `follow`, `sub`, `raid`, `stream_start`, `stream_end` |
| Facebook | `comment`, `follow`, `stream_start`, `stream_end` |
| X (Twitter) | `comment`, `follow`, `stream_start`, `stream_end` |
| Bilibili | `comment`, `gift`, `follow`, `stream_start`, `stream_end` |

---

### Devices (`/devices/...`)

> **🔒 Authorization Required:** All endpoints in this section require authentication via `X-User-ID` header. The API verifies that the authenticated user owns each device before allowing access. Attempting to access another user's device will return `403 Forbidden`.

Registered smart home devices. Credentials are stored per-brand.

**Device object:**
```json
{
  "id": "string (nano-time ID, e.g. \"device_1748500000000\")",
  "user_id": "integer",
  "name": "string",
  "brand": "govee | hue | kasa | lifx | tuya | nanoleaf | yeelight | wled | wyze | amazon | custom",
  "product_id": "string (e.g. govee-h6159, hue-color, or custom_product_id for custom brand)",
  "product_name": "string (human-readable product name from catalog, e.g. 'H6159 LED Strip')",
  "supported_actions": ["string (device capability IDs, e.g. 'on', 'off', 'brightness', 'color')"],
  "room": "string (optional)",
  "is_configured": true,
  "status": "online | offline | unknown",
  "credentials": "object (shape varies by brand — see below; omitted in list responses)",
  "device_group_id": "string (optional; nano-time ID if device belongs to a group)"
}
```

**Product Information Sourcing:**
- `product_name` is populated from the product catalog when the device is retrieved. If the product is not found in the catalog, this field is omitted from the response.
- `supported_actions` is populated from the product catalog. Contains device capabilities like `"on"`, `"off"`, `"brightness"`, `"color"`, `"temperature"`, etc. If the product is not found in the catalog, this field is omitted from the response.
- For `custom` brand devices, `supported_actions` is omitted (actions are user-defined HTTP requests).

**Credentials shape per brand** — flat JSON, snake_case, no brand-nesting (brand is already in the device body):

| Brand | Fields |
|-------|--------|
| govee | `api_key`, `device_id` |
| hue | `bridge_ip`, `api_key`, `light_id` |
| kasa | `device_ip` |
| lifx | `api_key`, `selector` |
| tuya | `client_id`, `client_secret`, `device_id`, `region` |
| nanoleaf | `device_ip`, `api_key` |
| yeelight | `device_ip` |
| wled | `device_ip` |
| wyze | `api_key`, `api_key_id`, `device_mac` |
| amazon | `endpoint_id` |
| custom | *(empty; actions are user-defined HTTP requests)* |

> **Storage note:** `credentials` is stored as a JSONB column in PostgreSQL. The flat layout (no brand nesting) is intentional — brand is a separate column and nesting would be redundant.  
> **Security note:** Credentials contain API keys and local IPs. Omit or mask the `credentials` field from `GET /devices` list responses; include it only in `GET /devices/get?id=<id>`.
> **Actions note:** `supported_actions` is populated from the product definition in the catalog. If a product is not in the catalog, this field is omitted from the response.

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/devices` | — | List all devices for the authenticated user (`credentials` omitted) |
| GET | `/devices/get?id=<id>` | — | Get a single device (includes `credentials`) |
| POST | `/devices` | `{ name, brand, product_id, room?, credentials }` | Register a device |
| PATCH | `/devices/update?id=<id>` | any subset of `{ name, product_id, room, credentials }` | Update a device |
| DELETE | `/devices?id=<id>` | — | Delete a device (conditions using it should have device_id cleared) |
| POST | `/devices/test?id=<id>` | — | Send a brief test command to the physical device (flash/ping) |

---

### Custom Devices (`/custom-products/...` and `/custom-actions/...`)

Users can register devices not in the catalog by creating custom product definitions with HTTP-based actions.
This is useful for generic smart home devices, local APIs, or home automation hubs.

**`user_custom_products` table:**
```json
{
  "id": "string (nano-time ID or UUID, e.g. \"cust_prod_1748500000000\")",
  "user_id": "integer (FK → users.id, CASCADE DELETE)",
  "name": "string (e.g., 'My Custom LED Controller')",
  "description": "string (optional — user notes about the device type)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

When a device references `brand: "custom"`, the `product_id` refers to the `id` of a custom product.

**`user_custom_actions` table:**
```json
{
  "id": "string (nano-time ID or UUID)",
  "custom_product_id": "string (FK → user_custom_products.id, CASCADE DELETE)",
  "action_name": "string (e.g., 'turn_on', 'set_brightness', 'power_cycle')",
  "http_method": "GET | POST | PUT | PATCH | DELETE",
  "http_url": "string (target URL; may include variable placeholders like {brightness})",
  "http_headers": "object (JSON map of header names to values, e.g. {\"Authorization\": \"Bearer token...\"})",
  "http_body_template": "string (JSON template; may include placeholders like {brightness}, {color})",
  "created_at": "timestamp"
}
```

**HTTP request variable substitution:**
When a condition triggers a custom action, the backend substitutes:
- `{action_name}` — the triggered action name (e.g., "turn_on")
- `{brightness}` — brightness value (0-100) if brightness action was triggered
- `{color}` — hex color (e.g., "#FF5733") if color action was triggered
- `{power_state}` — "on" or "off" if power action was triggered

Example custom action body template:
```json
{ "action": "{action_name}", "brightness": {brightness} }
```

**API endpoints:**

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/custom-products` | — | List user's custom products |
| GET | `/custom-products/get?id=<id>` | — | Get a custom product with its actions |
| POST | `/custom-products` | `{ name, description? }` | Create a custom product |
| PATCH | `/custom-products/update?id=<id>` | `{ name?, description? }` | Update custom product metadata |
| DELETE | `/custom-products?id=<id>` | — | Delete custom product (and cascade all its actions) |
| GET | `/custom-actions?product_id=<id>` | — | List all actions for a custom product |
| GET | `/custom-actions/get?id=<id>` | — | Get a single custom action (with product details) |
| POST | `/custom-actions` | `{ custom_product_id, action_name, http_method, http_url, http_headers?, http_body_template? }` | Create a custom action |
| PATCH | `/custom-actions/update?id=<id>` | any of above fields | Update custom action |
| DELETE | `/custom-actions?id=<id>` | — | Delete a custom action |

---

### Streams (`/streams/...`)

The user's own streaming accounts — the channels they stream *from* (YouTube, Twitch, NicoNico).
Distinct from **watched channels** (which are channels they monitor *for events*).

**Stream object:**
```json
{
  "id": "string (nano-time ID, e.g. \"stream_1748500000000\")",
  "user_id": "integer",
  "name": "string",
  "platform": "youtube | twitch | niconico | instagram | tiktok | kick | facebook | x | bilibili",
  "rtmp_url": "string",
  "stream_key": "string (masked in list responses)",
  "is_active": true,
  "status": "live | offline | ended",
  "started_at": "2026-05-25T14:35:00Z | null",
  "metrics": {
    "viewers": 1523,
    "uptime_seconds": 4980,
    "health": "excellent | good | fair | poor",
    "bitrate_kbps": 5000,
    "fps": 60,
    "resolution": "1920x1080"
  }
}
```

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/streams` | — | List all streams (mask `stream_key`) |
| GET | `/streams/get?id=<id>` | — | Get stream with full details including `stream_key` |
| POST | `/streams` | `{ name, platform, rtmp_url, stream_key }` | Register a stream account |
| PATCH | `/streams/update?id=<id>` | any subset of `{ name, rtmp_url, stream_key, is_active }` | Update stream |
| DELETE | `/streams?id=<id>` | — | Delete a stream account |

> The portal's streams page also shows live metrics (viewers, bitrate, fps, resolution, uptime).
> If those come from an external polling service rather than this API, a separate metrics endpoint
> may be needed — e.g. `GET /streams/metrics?id=<id>`.

---

## Catalog: Brands & Products ✅

The catalog is a **global reference table** of known smart-home device brands and product models.
It is **not user-scoped** — any authenticated user can read it for populating UI dropdowns.

> **Important — no foreign key from `devices`**
> `Device.brand` and `Device.product_id` are plain strings. They _may_ match a catalog slug but
> are not constrained to. This is intentional: users can register unknown/unreleased devices, and
> obsolete products can be removed from the catalog without breaking existing devices.

### Brands — Affiliate & Monetization Fields

Each brand now includes optional monetization metadata:

| Field | Type | Purpose |
|-------|------|---------|
| `affiliate_url` | string (nullable) | Direct link to purchase devices from the brand (for affiliate tracking) |
| `affiliate_commission_percent` | decimal (nullable) | Commission rate earned per sale through the affiliate link (e.g., `5.50` for 5.5%) |
| `requires_brand_credentials` | boolean | Flag indicating if the brand may require brand-level OAuth or credentials in the future (for planning purposes) |

**Frontend usage:** When displaying brands to users registering devices, show a "Buy on [Brand]" link next to brands with `affiliate_url` populated. This enables monetization while helping users discover and purchase devices.

---

### GET /catalog/brands

List all brands.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `active_only` | `true` | Set to `false` to include retired brands |

**Response `200`:** *(sorted by `sort_order` ASC, then by `name` ASC)*
```json
[
  {
    "id": "govee",
    "name": "Govee",
    "website": "https://www.govee.com",
    "logo_url": "https://www.govee.com/favicon.ico",
    "icon": "💡",
    "brand_color": "#4F7EFF",
    "affiliate_url": "https://govee.mention-me.com/your-tracking-id",
    "affiliate_commission_percent": 5.50,
    "authentication_type": "api_key",
    "docs_url": "https://developer.govee.com",
    "docs_label": "Govee Developer API",
    "credential_fields": [
      {
        "id": "api_key",
        "label": "Govee API Key",
        "type": "password",
        "help": "Get in Govee Home app → Profile → About Us → Request API Key",
        "placeholder": ""
      }
    ],
    "device_identification_required": [
      {
        "type": "device_id",
        "label": "Device ID",
        "description": "The unique device identifier from the Govee app",
        "placeholder": "1a2b3c4d5e6f",
        "required": true
      }
    ],
    "sort_order": 1,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "lifx",
    "name": "LIFX",
    "website": "https://www.lifx.com",
    "logo_url": "https://www.lifx.com/favicon.ico",
    "icon": "💡",
    "brand_color": "#000000",
    "affiliate_url": null,
    "affiliate_commission_percent": null,
    "authentication_type": "none",
    "docs_url": "https://api.developer.lifx.com/",
    "docs_label": "LIFX HTTP API Documentation",
    "credential_fields": [],
    "device_identification_required": [
      {
        "type": "mac_address",
        "label": "MAC Address",
        "description": "The MAC address of the LIFX device on your network",
        "placeholder": "aa:bb:cc:dd:ee:ff",
        "required": true
      }
    ],
    "sort_order": 2,
    "is_active": true,
    "created_at": "2026-08-04T12:44:00Z",
    "updated_at": "2026-08-04T12:44:00Z"
  },
  {
    "id": "tuya",
    "name": "Tuya",
    "website": "https://www.tuya.com",
    "logo_url": "https://www.tuya.com/favicon.ico",
    "icon": "🔌",
    "brand_color": "#FF6B6B",
    "affiliate_url": null,
    "affiliate_commission_percent": null,
    "authentication_type": "oauth",
    "docs_url": "https://developer.tuya.com",
    "docs_label": "Tuya Developer Platform",
    "credential_fields": [
      {
        "id": "oauth",
        "label": "Login with Tuya",
        "type": "info",
        "help": "Click to authorize via Tuya OAuth",
        "placeholder": ""
      }
    ],
    "device_identification_required": [
      {
        "type": "device_id",
        "label": "Device ID",
        "description": "The unique device ID from Tuya",
        "placeholder": "tuya_1234567890",
        "required": true
      }
    ],
    "sort_order": 3,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### GET /catalog/brands/get?id=\<id\>

Get a brand with its product list.

**Response `200`:**
```json
{
  "brand": { 
    "id": "govee", 
    "name": "Govee", 
    "website": "https://www.govee.com",
    "logo_url": "https://www.govee.com/favicon.ico",
    "icon": "💡",
    "brand_color": "#4F7EFF",
    "affiliate_url": "https://govee.mention-me.com/your-tracking-id",
    "affiliate_commission_percent": 5.50,
    "authentication_type": "api_key",
    "docs_url": "https://developer.govee.com",
    "docs_label": "Govee Developer API",
    "credential_fields": [
      {
        "id": "api_key",
        "label": "Govee API Key",
        "type": "password",
        "help": "Get in Govee Home app → Profile → About Us → Request API Key",
        "placeholder": ""
      }
    ],
    "device_identification_required": [
      {
        "type": "device_id",
        "label": "Device ID",
        "description": "The unique device identifier from the Govee app",
        "placeholder": "1a2b3c4d5e6f",
        "required": true
      }
    ],
    "sort_order": 1,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "products": [
    { "id": "govee-h6159", "brand_id": "govee", "name": "H6159 LED Strip", "category": "light_strip", "supported_actions": ["set_color","set_brightness"], "is_active": true, "created_at": "2024-01-15T10:30:00Z", "updated_at": "2024-01-15T10:30:00Z" }
  ]
}
```

---

### POST /catalog/brands

Create a brand. (Admin operation — access control is portal-side for now.)

**Body:**
```json
{
  "id": "acme",          // required — slug, must be unique (e.g. "acme")
  "name": "Acme Lights", // required
  "website": "https://acme.example.com",
  "logo_url": "https://cdn.example.com/acme.png",
  "icon": "💡", // optional — emoji or icon identifier
  "brand_color": "#FF5733", // optional — hex color for device card accent
  "affiliate_url": "https://acme.example.com/ref?code=TAUCHO", // optional — affiliate link for purchasing
  "affiliate_commission_percent": 5.50, // optional — commission rate (e.g., 5.50%)
  "authentication_type": "api_key", // required — one of: "api_key", "bearer_token", "oauth", "none"
  "docs_url": "https://developer.acme.com", // optional — documentation URL
  "docs_label": "Acme Developer Docs", // optional — documentation link label
  "credential_fields": [ // optional — array of credential field definitions for frontend form rendering
    {
      "id": "api_key",
      "label": "Acme API Key",
      "type": "password", // "text", "password", or "info"
      "help": "Get your API key from your Acme account settings",
      "placeholder": "sk_live_..."
    }
  ],
  "device_identification_required": [ // optional — array of device identifier types required for discovery
    {
      "type": "device_id", // identifier type: "device_id", "mac_address", "ip_address", "model_name", etc.
      "label": "Device ID",
      "description": "The unique device identifier from the Acme app",
      "placeholder": "1a2b3c4d5e6f",
      "required": true
    }
  ],
  "sort_order": 1, // optional — display order priority; null = alphabetical
  "is_active": true      // optional, default true
}
```

**Response `201`** — created brand object.

---

### PATCH /catalog/brands/update?id=\<id\>

Update brand fields (partial update — only supplied fields are changed).

**Body:** same fields as create (all optional).

**Response `200`** — updated brand object.

---

### DELETE /catalog/brands?id=\<id\>

Delete a brand. All its products are also deleted (`ON DELETE CASCADE`).

**Response `200`:** `{ "status": "deleted" }`

---

### GET /catalog/products?brand_id=\<id\>&active_only=true&search=\<q\>&category=\<cat\>&sort_by=\<field\>&limit=\<n\>&offset=\<n\>

List products with optional pagination, search, filtering, and sorting.

> **🟢 LIFX Products: API-Based** — LIFX products are dynamically fetched from LIFX's GitHub repository (https://github.com/LIFX/products) instead of stored in the database. When requesting `brand_id=lifx`, the API fetches the authoritative 173+ products. Products are cached locally for 24 hours. All LIFX products are automatically categorized based on device capabilities (color, multizone, matrix, etc.) and have supported_actions mapped based on their features.

**Query params:**
| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `brand_id` | _(all)_ | — | Filter to a specific brand (e.g. `lifx`) |
| `active_only` | `true` | — | Set to `false` to include retired products |
| `search` | _(none)_ | — | Prefix search on product name and category (case-insensitive) |
| `category` | _(all)_ | — | Filter by category (e.g. `bulbs`, `strips`, `panels`, `smart_plugs`, etc.) |
| `sort_by` | `name` | — | Sort field: `name`, `category`, or `created_at` (ascending order) |
| `limit` | `50` | `200` | Items per page (clamped to max 200) |
| `offset` | `0` | — | Pagination offset for result paging |

**Response `200`:**
```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 847,
    "total_pages": 17,
    "has_next": true,
    "has_previous": false
  },
  "products": [
    {
      "id": "lifx-1",
      "brand_id": "lifx",
      "name": "LIFX Original",
      "category": "light",
      "thumbnail_url": "",
      "supported_actions": ["set_color", "set_brightness", "turn_on", "turn_off", "set_color_temperature", "start_effect"],
      "is_active": true,
      "created_at": "2026-08-04T12:44:55Z",
      "updated_at": "2026-08-04T12:44:55Z"
    },
    {
      "id": "lifx-2",
      "brand_id": "lifx",
      "name": "LIFX Original 1000",
      "category": "light",
      "thumbnail_url": "",
      "supported_actions": ["set_color", "set_brightness", "turn_on", "turn_off", "set_color_temperature", "start_effect"],
      "is_active": true,
      "created_at": "2026-08-04T12:44:55Z",
      "updated_at": "2026-08-04T12:44:55Z"
    },
    {
      "id": "lifx-57",
      "brand_id": "lifx",
      "name": "LIFX Tile",
      "category": "matrix_light",
      "thumbnail_url": "",
      "supported_actions": ["set_color", "set_brightness", "turn_on", "turn_off", "set_matrix_pattern", "start_effect"],
      "is_active": true,
      "created_at": "2026-08-04T12:44:55Z",
      "updated_at": "2026-08-04T12:44:55Z"
    }
  ]
}
```

**Search behavior:** Prefix match (case-insensitive) on `name` and `category`. Example: `search=a19` matches "LIFX A19", `search=strip` matches "Lightstrip" and "LED Strip".

---

### GET /catalog/products/get?id=\<id\>

Get a single product.

**Response `200`:**
```json
{
  "id": "lifx-1",
  "brand_id": "lifx",
  "name": "LIFX Original",
  "category": "light",
  "thumbnail_url": "",
  "supported_actions": ["set_color", "set_brightness", "turn_on", "turn_off", "set_color_temperature", "start_effect"],
  "is_active": true,
  "created_at": "2026-08-04T12:44:55Z",
  "updated_at": "2026-08-04T12:44:55Z"
}
```

---

### POST /catalog/products

Create a product.

**Body:**
```json
{
  "id": "govee-h6159",        // required — slug
  "brand_id": "govee",         // required — must exist in brands table
  "name": "H6159 LED Strip",  // required
  "category": "light_strip",
  "thumbnail_url": "",
  "supported_actions": ["set_color", "set_brightness", "turn_on", "turn_off"],
  "is_active": true
}
```

`supported_actions` values must be valid device action keys (see `ValidDeviceActions` in `models/condition.go`).

**Response `201`** — created product object.

---

### PATCH /catalog/products/update?id=\<id\>

Update product fields (partial update).

**Response `200`** — updated product object.

---

### DELETE /catalog/products?id=\<id\>

Delete a product.

**Response `200`:** `{ "status": "deleted" }`

---

### Pre-seeded Brands

On first startup the following 10 brands are seeded automatically (`ON CONFLICT DO NOTHING`):

| ID | Name |
|----|------|
| `govee` | Govee |
| `hue` | Philips Hue |
| `kasa` | TP-Link Kasa |
| `lifx` | LIFX |
| `tuya` | Tuya |
| `nanoleaf` | Nanoleaf |
| `yeelight` | Yeelight |
| `wled` | WLED (DIY) |
| `wyze` | Wyze |
| `amazon` | Amazon Alexa |

Products must be added manually (via `POST /catalog/products`) as specific device models become known.

---

## Brand Authentication & Credentials ⚠️ NOT YET IMPLEMENTED

**Status:** Required for `/brand-settings` page to function. Currently missing.

The portal needs to store and manage **user-specific brand credentials** (API keys, OAuth tokens, device IPs, etc.) for device integrations. This is separate from the global `catalog/brands` table and is user-scoped.

### `user_brand_credentials` Table (NEW)

```json
{
  "id": "string (nano-time ID or UUID, e.g. \"ubcred_1748500000000\")",
  "user_id": "integer (FK → users.id, CASCADE DELETE)",
  "brand_id": "string (e.g., 'govee', 'hue', 'tuya' — references catalog.brands.id)",
  "auth_type": "string (one of: 'api_key', 'oauth', 'local', 'bearer_token', 'none')",
  "status": "string (one of: 'connected', 'expired', 'revoked', 'invalid')",
  
  // Credential payload — varies by brand and auth_type
  "credentials": "jsonb ({
    'api_key'?: string,           // For api_key auth (Govee, Lifx, Wyze)
    'device_id'?: string,         // For local/IP devices (Nanoleaf, Yeelight, Kasa, WLED)
    'bridge_ip'?: string,         // For Hue bridge
    'light_id'?: string,          // For Hue light ID
    'selector'?: string,          // For Lifx device selector
    'device_mac'?: string,        // For Wyze MAC address
    'region'?: string,            // For Tuya region
    'client_id'?: string,         // For Tuya OAuth
    'client_secret'?: string,     // For Tuya OAuth
    // More fields as needed per brand
  })",
  
  // OAuth token storage (if auth_type = 'oauth')
  "oauth_access_token": "string (nullable, masked in list responses)",
  "oauth_refresh_token": "string (nullable, masked in list responses, NOT returned to client)",
  "oauth_token_expires_at": "timestamp (nullable)",
  "oauth_scope": "string (space-separated, e.g. 'read write')",
  
  // Metadata
  "is_primary": "bool (one brand per user per type; one 'primary' per brand for multi-account)",
  "connected_at": "timestamp (when user first successfully authenticated)",
  "last_tested_at": "timestamp (last time credentials were validated)",
  "last_used_at": "timestamp (last time a device using these credentials was controlled)",
  "error_message": "string (nullable — last error message if status is 'invalid' or 'expired')",
  
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Unique constraints:**
- `(user_id, brand_id)` — **one** credential set per brand per user (initially). If future feature allows multiple per brand, add `is_primary` to unique constraint instead.

**Indexes:**
- `user_id, brand_id` (for quick lookup)
- `user_id, status` (for finding expired/invalid)

### Brand Credentials Endpoints

#### GET /auth/brands

**Purpose:** Get all brands and their connection status for the current user.

**Response `200`:**
```json
{
  "brands": [
    {
      "id": "govee",
      "name": "Govee",
      "is_connected": true,
      "auth_type": "api_key",
      "status": "connected",
      "connected_at": "2026-05-20T10:30:00Z",
      "last_tested_at": "2026-06-24T14:15:00Z",
      "error_message": null
    },
    {
      "id": "hue",
      "name": "Philips Hue",
      "is_connected": false,
      "auth_type": "local",
      "status": null,
      "connected_at": null,
      "last_tested_at": null,
      "error_message": null
    },
    {
      "id": "tuya",
      "name": "Tuya",
      "is_connected": true,
      "auth_type": "oauth",
      "status": "connected",
      "connected_at": "2026-06-10T09:00:00Z",
      "last_tested_at": "2026-06-24T18:00:00Z",
      "oauth_scope": "read write",
      "error_message": null
    }
  ]
}
```

**Notes:**
- Does NOT return credential values (api_key, tokens, IPs, etc.)
- Shows connection status for UI badges
- Shows `last_tested_at` for debugging

**Error responses:**
- `401` — not authenticated

---

#### GET /auth/brands/\<brand_id\>

Get detailed connection status for a specific brand.

**Response `200`:**
```json
{
  "id": "govee",
  "name": "Govee",
  "is_connected": true,
  "auth_type": "api_key",
  "status": "connected",
  "connected_at": "2026-05-20T10:30:00Z",
  "last_tested_at": "2026-06-24T14:15:00Z",
  "last_used_at": "2026-06-24T22:10:00Z",
  "error_message": null,
  "credential_fields": [
    // Returned from catalog/brands, showing what fields are stored
    { "id": "api_key", "label": "API Key", "type": "password" },
    { "id": "device_id", "label": "Device ID", "type": "text" }
  ]
}
```

---

#### POST /auth/brand/\<brand_id\>/connect

Save/update credentials for a brand.

**Body (varies by brand):**

For API-key brands (Govee, Lifx):
```json
{
  "auth_type": "api_key",
  "credentials": {
    "api_key": "...",
    "device_id": "..." // optional, brand-dependent
  }
}
```

For local IP brands (Hue, Nanoleaf):
```json
{
  "auth_type": "local",
  "credentials": {
    "bridge_ip": "192.168.1.50",
    "api_key": "...",
    "light_id": "..." // optional
  }
}
```

For OAuth brands (Tuya):
```json
{
  "auth_type": "oauth",
  "oauth_code": "...",           // From OAuth callback
  "oauth_state": "..."           // For CSRF validation
}
```

**Response `200` / `201`:**
```json
{
  "id": "ubcred_...",
  "brand_id": "govee",
  "status": "connected",
  "connected_at": "2026-06-24T23:27:37Z",
  "error_message": null
}
```

**Error responses:**
- `400` — invalid credentials format, missing required fields
- `401` — not authenticated
- `422` — credentials validation failed (e.g., invalid IP, unreachable device)
- `503` — brand API unreachable (backend tried to validate)

---

#### POST /auth/brand/\<brand_id\>/test

Test credentials without saving (validation only).

**Body:** Same as `/connect` endpoint.

**Response `200`:**
```json
{
  "is_valid": true,
  "message": "✅ Credentials verified. Found 3 devices.",
  "device_count": 3,
  "devices": [
    { "id": "device_1", "name": "Living Room Light", "status": "online" },
    { "id": "device_2", "name": "Bedroom Light", "status": "offline" },
    { "id": "device_3", "name": "Kitchen Light", "status": "online" }
  ]
}
```

**Response `422` (validation failed):**
```json
{
  "is_valid": false,
  "error": "Invalid API key. Check your Govee app settings."
}
```

---

#### POST /auth/brand/\<brand_id\>/disconnect

Revoke/delete brand credentials.

**Response `200`:**
```json
{ "status": "disconnected" }
```

**Response `204`:** (no content) — also acceptable

---

#### PATCH /auth/brand/\<brand_id\>/update

Partially update credentials (e.g., update device IP without changing API key).

**Body:**
```json
{
  "credentials": {
    "bridge_ip": "192.168.1.51"  // Only update this field
  }
}
```

**Response `200`:**
```json
{
  "id": "ubcred_...",
  "brand_id": "hue",
  "status": "connected",
  "updated_at": "2026-06-24T23:27:37Z"
}
```

---

### OAuth Flow for Brand Credentials

For OAuth brands (currently Tuya; potentially Lifx in future):

1. **Frontend calls:** `GET /auth/brand/tuya/oauth-start`
2. **Backend returns:** `{ "auth_url": "https://tuya.cloud/...", "state": "..." }`
3. **Frontend:** Redirects user to Tuya login page
4. **Tuya redirects back to:** `/callback?code=...&state=...`
5. **Frontend calls:** `POST /auth/brand/tuya/connect` with code + state
6. **Backend:** Exchanges code for tokens, saves to `user_brand_credentials`
7. **Frontend:** Shows success message

---

### Database Schema (PostgreSQL)

```sql
CREATE TABLE user_brand_credentials (
  id VARCHAR(32) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id VARCHAR(50) NOT NULL,  -- References catalog.brands(id)
  auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('api_key', 'oauth', 'local', 'bearer_token', 'none')),
  status VARCHAR(20) CHECK (status IN ('connected', 'expired', 'revoked', 'invalid')),
  
  credentials JSONB NOT NULL,
  
  oauth_access_token VARCHAR(2048),
  oauth_refresh_token VARCHAR(2048),
  oauth_token_expires_at TIMESTAMP,
  oauth_scope TEXT,
  
  is_primary BOOLEAN DEFAULT true,
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_tested_at TIMESTAMP,
  last_used_at TIMESTAMP,
  error_message TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, brand_id),
  CONSTRAINT valid_oauth_fields CHECK (
    (auth_type != 'oauth') OR (oauth_access_token IS NOT NULL)
  ),
  FOREIGN KEY (brand_id) REFERENCES catalog.brands(id)
);

CREATE INDEX idx_user_brand_credentials_user_id ON user_brand_credentials(user_id);
CREATE INDEX idx_user_brand_credentials_user_brand ON user_brand_credentials(user_id, brand_id);
CREATE INDEX idx_user_brand_credentials_status ON user_brand_credentials(user_id, status);
```

---

### Migration Notes

If this table is added in a migration:

1. **Backward compatibility:** New column, no data migration needed
2. **Optional initially:** Brand settings page can gracefully degrade if endpoint not available
3. **Data model:** No cascade deletes to devices — disconnecting a brand credential doesn't delete devices. Devices remain with invalid credentials (visible error in UI).

---

### Future Enhancements

1. **Multiple credentials per brand:** Change unique constraint to `(user_id, brand_id, is_primary)` when multi-account support is needed
2. **Credential sharing:** Add `shared_with` JSONB array to allow household members access
3. **Audit logging:** Add `audit_log` table tracking when credentials were accessed/used
4. **Encryption:** Encrypt `credentials` JSONB at rest using `pgcrypto`
5. **Credential versioning:** Store old credentials in history for audit trail

---

## Live Events ✅


Real-time in-stream interaction events (comments, gifts, superchats, etc.) ingested by the platform listener layer once a live stream is detected.

> **Note:** Live events are **write-only from the server side** — the platform listener writes them during a live stream. The API exposed here is **read-only** for the portal.

### Event types

| `event_type` | Description | Platforms |
|---|---|---|
| `comment` | Regular chat message / danmaku | YouTube, Twitch, NicoNico, TikTok, Kick, Bilibili |
| `superchat` | Paid super chat with amount | YouTube, Bilibili |
| `sticker` | Paid super sticker | YouTube |
| `gift` | Virtual gift or gift subscription | Twitch, NicoNico, TikTok, Bilibili |
| `cheer` | Twitch Bits | Twitch |
| `member` | New channel member / guard buy | YouTube, Bilibili |
| `follow` | New follower | Twitch, Kick |
| `sub` | New subscription | Twitch, Kick |
| `raid` | Incoming raid | Twitch |
| `nicoru` | NicoNico nicoru reaction | NicoNico |
| `like` | TikTok like burst | TikTok |
| `hype_train` | Twitch Hype Train progress | Twitch |
| `reaction` | Facebook Live reaction | Facebook |
| `viewer_join` | User entered the stream | TikTok, Bilibili |

### GET /live-events

List live events with optional filters.

**Query params:**
| Param | Description |
|-------|-------------|
| `stream_id` | Filter to events from a specific `stream_events.id` (most common) |
| `watch_id` | Filter to events from a specific watch target (all-time) |
| `event_type` | Optional: filter to one event type |
| `limit` | Max results. Default: 200 for `stream_id` queries, 100 otherwise |

If neither `stream_id` nor `watch_id` is provided, returns the authenticated user's most recent events across all streams.

**Response `200`:**
```json
[
  {
    "id": "evt_01jw...",
    "user_id": 42,
    "watch_target_id": "watch_...",
    "stream_event_id": "stream_...",
    "platform": "twitch",
    "event_type": "superchat",
    "sender_id": "123456",
    "sender_name": "CoolViewer",
    "sender_avatar": "https://...",
    "message": "素晴らしい配信！",
    "amount_value": 500,
    "amount_currency": "JPY",
    "amount_display": "¥500",
    "is_member": true,
    "is_mod": false,
    "badges": ["subscriber/6", "bits/1000"],
    "received_at": "2026-06-02T10:30:00Z",
    "created_at": "2026-06-02T10:30:00Z"
  }
]
```

### GET /live-events/get?id=\<id\>

Returns a single live event by its ID.

### GET /live-events/count?stream_id=\<id\>

Returns a per-type count summary for a stream. All known `event_type` values are always included (zero if none received).

**Response `200`:**
```json
{
  "comment": 1423,
  "superchat": 8,
  "gift": 3,
  "cheer": 0,
  "member": 2,
  ...
}
```

---

## Summary Checklist

| Resource | List | Get | Create | Update | Delete | Other |
|----------|------|-----|--------|--------|--------|-------|
| Auth/User | — | ✅ | — | ✅ | ✅ | ✅ logout, ✅ oauth |
| NicoNico | — | ✅ status | — | — | ✅ disconnect | ✅ login, ✅ mfa |
| Platform Discovery | — | — | — | — | — | ✅ YouTube search/subs/mine, ✅ Twitch search/following/mine, ✅ NicoNico search/mine, ✅ Instagram search/mine, ✅ Facebook search/mine, ✅ TikTok search/mine, ✅ X search/mine, ⚠️ Kick search (501), ⚠️ Bilibili search (geo-restricted) |
| Watches | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Stream Events | ✅ | ✅ | — | — | — | — |
| Conditions | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Devices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ test (stub) |
| Streams | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Catalog / Brands | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Catalog / Products | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Live Events | ✅ | ✅ | — | — | — | ✅ count by stream |

---

## Route Prefix Status

All routes are now registered **without** `/api/` prefix, matching the portal proxy expectation:

| Portal JS calls | API server registers |
|---|---|
| `/api/watches` | `GET /watches` |
| `/api/conditions` | `GET /conditions` |
| `/api/devices` | `GET /devices` |
| `/api/streams` | `GET /streams` |
| `/api/poller/status` | `GET /poller/status` |

---

## ID Type Convention

Two different ID types are used depending on the resource:

| Field | Type | Example | Reason |
|-------|------|---------|--------|
| `users.id` | integer | `42` | PostgreSQL `SERIAL` — auto-increment PK |
| `oauth_accounts.id` | integer | `7` | Same — DB-managed |
| `watch.id`, `device.id`, `condition.id`, `stream_account.id` | **string** | `"watch_1748500000000"` | Nano-time identifiers — opaque like UUIDs. Prevents enumeration attacks. Stored as `TEXT PRIMARY KEY` in the DB. |
| `user_id` (FK in all resource tables) | **integer** | `42` | References `users.id` (SERIAL) |

**Portal note:** treat resource IDs as opaque strings — never `parseInt()` them, never assume they are numeric. `user_id` fields are always integers matching the logged-in user's account ID.

---


- **OAuth providers**: All OAuth providers (Google/YouTube, Twitch, Instagram, Facebook, TikTok, Kick, X, and Bilibili) are now fully implemented. NicoNico uses a session-proxy login mechanism (not standard OAuth).
- **Device test stub**: `POST /devices/test?id=` acknowledges the request but doesn't call the actual device SDK. Each `brand` needs its own implementation.
- **Stream metrics**: `GET /streams/get` returns the full stream account but not live metrics (viewers/bitrate/fps). A separate polling integration or `GET /streams/metrics?id=` would be needed.
- **oauth_accounts table name**: The spec uses `oauth_connections` as the logical concept name, but the database table may be named `oauth_accounts` internally. The API endpoints and behaviour are the same.
- **NicoNico semi-OAuth**: Session-proxy login is implemented (`POST /niconico/login`, `POST /niconico/login/mfa`, `GET /niconico/status`, `DELETE /niconico/session`). Official OAuth credential from Dwango is still pending.
- **User ownership**: All watches, conditions, devices, and stream accounts have a `user_id` FK. The portal proxy injects an `X-User-ID` header (integer, matching `users.id`) on every forwarded request so the API can resolve ownership without re-parsing the session cookie. See the **X-User-ID Header** section below.

---

## X-User-ID Header

The portal server acts as a **trusted reverse proxy**. On every request forwarded to the API under `/api/`, the portal:

1. Reads the session cookie from the browser request
2. Calls `GET /auth/user` to validate the cookie and retrieve the user profile
3. Injects `X-User-ID: <integer>` into the forwarded request header

### What the API should do

For all resource endpoints (`/watches`, `/devices`, `/conditions`, `/streams`, etc.), the API should read the user ID from the `X-User-ID` header rather than re-parsing the session cookie:

```
X-User-ID: 42
```

**Auth endpoints** (`/auth/user`, `/auth/login`, `/auth/logout`, `/auth/connections`, `/oauth/login`, `/auth/callback/*`) still use the session cookie directly — the portal does not inject `X-User-ID` on auth calls where the user may not be known yet.

### Security note

`X-User-ID` is injected by the portal proxy, not by the browser. The API should trust this header **only** from requests that arrive via the portal proxy. In production (Cloud Run), the API is not publicly reachable — all traffic comes through the portal. In local development the API is on localhost:8081, similarly only reachable from the portal process.

If the API is ever exposed publicly, it should validate that `X-User-ID` is only trusted when the request also carries a valid `Authorization: Bearer <identity-token>` (the Cloud Run identity token the portal attaches).

### Why this approach

- Avoids the API needing its own session store or cookie parser on every resource request
- The portal's `fetchUser()` call is already happening for page renders — on API proxy calls it adds one extra `/auth/user` round-trip per request (acceptable for now; can be optimised later with a short-lived cache keyed by session cookie)
- `user_id` FK filtering at the DB layer ensures data isolation even if the header is somehow wrong

---

## Catalog Brand Schema Extensions (Devices Page Refactoring)

### Extended Brand Fields
The Catalog `/brands` endpoint now includes static credential field definitions and documentation links. These are **system-wide static values**, not user-specific credentials.

**New fields added to `Brand` object:**
```json
{
  "id": "govee",
  "name": "Govee",
  "logo_url": "https://...",
  "brand_color": "#4F7EFF",
  "icon": "💡",
  "affiliate_url": "https://...",
  "credential_fields": [
    {
      "id": "api_key",
      "label": "Govee API Key",
      "type": "password",
      "help": "Get in Govee Home app → Profile → About Us → Request API Key",
      "placeholder": ""
    },
    {
      "id": "device_id",
      "label": "Device ID",
      "type": "text",
      "help": "Found in Govee Home app → device → device info, or via GET /v1/devices",
      "placeholder": ""
    }
  ],
  "docs_url": "https://developer.govee.com",
  "docs_label": "Govee Developer API Docs"
}
```

**Credential Field Types:**
- `"text"` — regular text input
- `"password"` — password input (masked in browser)
- `"info"` — informational message (no input field)

**Purpose:** Frontend can now render brand credential forms server-side using `credential_fields` instead of hardcoding `BRAND_CREDS` in JavaScript.

---

## Action Metadata Endpoint (Optional Future)

### Proposed: GET `/actions/metadata` 🔲

Returns all supported device action types with their UI metadata (icons, labels).

**Response:**
```json
{
  "actions": [
    {
      "id": "on",
      "label": "Turn On",
      "icon": "🔆",
      "category": "power"
    },
    {
      "id": "off",
      "label": "Turn Off",
      "icon": "🔅",
      "category": "power"
    },
    {
      "id": "brightness",
      "label": "Set Brightness",
      "icon": "✦",
      "category": "dimming"
    },
    {
      "id": "color",
      "label": "Set Color",
      "icon": "🎨",
      "category": "color"
    }
  ]
}
```

**Purpose:** Replace hardcoded `ACTION_META` in JavaScript. Frontend embeds this data server-side in template or as JSON blob.

**Status:** 🔲 Not yet implemented — currently hardcoded in frontend JavaScript as `ACTION_META`.

---

## Event Metadata Discovery — ✅ Implemented

Frontend needs to know which events are available per provider and what fields are in each event.

### GET /event-metadata

Returns metadata about available providers and supported event types.

**No authentication required.**

**Response:**
```json
{
  "providers": {
    "youtube": {
      "events": ["comment", "superchat", "sticker", "member"]
    },
    "twitch": {
      "events": ["comment", "gift", "cheer", "member", "follow", "sub", "raid", "hype_train"]
    },
    "niconico": {
      "events": ["comment"]
      // NOTE: Real monetization via NicoNico points:
      // - nicoad (広告): User advertisement system
      // - gift (ギフト): Gift/item system
      // スーパーチャット does NOT exist on NicoNico
      // Actual event types and field names require verification with production data
    },
    "bilibili": {
      "events": ["comment", "superchat", "member", "gift", "viewer_join"]
    },
    "tiktok": {
      "events": ["comment", "gift", "like", "viewer_join", "follow"]
    },
    "instagram": {
      "events": ["comment"]
      // NOTE: Instagram does NOT have official real-time API for gifts, reactions, or other live events.
      // Only comments supported via unofficial methods (violates ToS).
    },
    "facebook": {
      "events": ["comment", "reaction"]
    },
    "kick": {
      "events": ["comment", "gift", "member", "follow"]
    },
    "twitcasting": {
      "events": ["comment", "gift"]
    },
    "x": {
      "events": ["comment"]
    }
  }
}
```

**Use case:**
- Frontend calls this once at startup to learn which providers support which events
- When creating a condition, filter event type options based on the selected provider

---

### GET /event-metadata/{platform}

Returns the list of event types supported by a specific platform.

**Path parameters:**
- `platform` (string): Provider name (e.g., `youtube`, `twitch`, `niconico`)

**No authentication required.**

**Response (example: GET /event-metadata/youtube):**
```json
{
  "platform": "youtube",
  "events": ["comment", "superchat", "sticker", "member"]
}
```

**Response (example: GET /event-metadata/twitch):**
```json
{
  "platform": "twitch",
  "events": ["comment", "gift", "cheer", "member", "follow", "sub", "raid", "hype_train"]
}
```

**Error responses:**
- 404: If the platform is not supported

**Use case:**
- Frontend calls this after user selects a platform
- Returns the available event types for that platform
- Used to populate the event type dropdown/filter in the UI

---

### GET /event-metadata/{platform}/{event}

Returns platform-specific event schema. Each platform and event type has unique fields available.

**Path parameters:**
- `platform` (string): Provider name (e.g., `youtube`, `twitch`, `niconico`)
- `event` (string): Event type (e.g., `comment`, `superchat`)

**No authentication required.**

**Response (example: GET /event-metadata/youtube/comment):**
```json
{
  "platform": "youtube",
  "event_type": "comment",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'comment' for this endpoint", "optional": false},
    "sender_id": {"name": "sender_id", "type": "string", "description": "YouTube channel ID of the commenter", "optional": false},
    "sender_name": {"name": "sender_name", "type": "string", "description": "Display name of the commenter", "optional": false},
    "sender_avatar": {"name": "sender_avatar", "type": "string", "description": "URL to the commenter's profile picture", "optional": true},
    "message": {"name": "message", "type": "string", "description": "Comment text", "optional": false},
    "is_member": {"name": "is_member", "type": "boolean", "description": "Whether the sender is a channel member", "optional": true},
    "badges": {"name": "badges", "type": "array", "description": "YouTube badges (e.g., 'member', 'moderator')", "optional": true},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Response (example: GET /event-metadata/niconico/comment):**
```json
{
  "platform": "niconico",
  "event_type": "comment",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'comment' for this endpoint", "optional": false},
    "sender_id": {"name": "sender_id", "type": "string", "description": "NicoNico user ID (optional; can be anonymous)", "optional": true},
    "sender_name": {"name": "sender_name", "type": "string", "description": "Display name of the commenter", "optional": false},
    "sender_avatar": {"name": "sender_avatar", "type": "string", "description": "URL to user profile picture", "optional": true},
    "message": {"name": "message", "type": "string", "description": "Comment text", "optional": false},
    "color": {"name": "color", "type": "string", "description": "Comment text color in hex format (e.g., '#FF0000', '#547698')", "optional": true},
    "color_rgb": {"name": "color_rgb", "type": "object", "description": "RGB breakdown of comment color (r, g, b: 0-255, hex: color string)", "optional": true},
    "position": {"name": "position", "type": "string", "description": "Screen position: 'ue' (top), 'naka' (middle), 'shita' (bottom)", "optional": true},
    "size": {"name": "size", "type": "string", "description": "Comment size: 'small', 'medium', 'big'", "optional": true},
    "font": {"name": "font", "type": "string", "description": "Font style: 'defont' (default), 'mincho' (serif), 'gothic' (sans-serif)", "optional": true},
    "opacity": {"name": "opacity", "type": "string", "description": "Comment opacity: 'Normal' (opaque), 'Translucent' (semi-transparent)", "optional": true},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Key differences by platform:**
- **YouTube comments**: Include `is_member` flag; no color/position fields
- **NicoNico comments**: Include comprehensive danmaku styling (`color`, `color_rgb`, `size`, `position`, `font`, `opacity`); `sender_id` is optional
- **Twitch comments**: Include `is_mod`, `badges`, channel-specific badges
- **Bilibili comments** (danmaku): Include `color`, `size`, `position` like NicoNico
- **TikTok/Instagram/Facebook comments**: Minimal field set (sender, message only)

**Error responses:**
- 404: If the platform or event type is not supported, returns an empty field set or HTTP 404

**Use case:**
- Frontend calls this when user is building a condition for a specific platform and event
- Display only the available fields for that platform-event combination
- Fields with `"optional": false` are always present; `"optional": true` fields may be absent for some events

---

### GET /event-metadata/niconico/nicoru

**Response (example: GET /event-metadata/niconico/nicoru):**
```json
{
  "platform": "niconico",
  "event_type": "nicoru",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'nicoru' for this endpoint (emotion/reaction)", "optional": false},
    "sender_id": {"name": "sender_id", "type": "string", "description": "NicoNico user ID (optional; can be anonymous)", "optional": true},
    "sender_name": {"name": "sender_name", "type": "string", "description": "Display name of the user", "optional": false},
    "sender_avatar": {"name": "sender_avatar", "type": "string", "description": "URL to user profile picture", "optional": true},
    "message": {"name": "message", "type": "string", "description": "Empty or reaction identifier", "optional": true},
    "color": {"name": "color", "type": "string", "description": "Emotion color in hex format", "optional": true},
    "color_rgb": {"name": "color_rgb", "type": "object", "description": "RGB breakdown of emotion color (r, g, b: 0-255, hex: color string)", "optional": true},
    "position": {"name": "position", "type": "string", "description": "Screen position: 'ue' (top), 'naka' (middle), 'shita' (bottom)", "optional": true},
    "size": {"name": "size", "type": "string", "description": "Emotion size: 'small', 'medium', 'big'", "optional": true},
    "opacity": {"name": "opacity", "type": "string", "description": "Emotion opacity: 'Normal' (opaque), 'Translucent' (semi-transparent)", "optional": true},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Note:** Nicoru represents emotion/reaction buttons during live. Similar styling to comments but often displayed as floating emoticons.

---

### GET /event-metadata/niconico/gift

**Response (example: GET /event-metadata/niconico/gift):**
```json
{
  "platform": "niconico",
  "event_type": "gift",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'gift' for this endpoint", "optional": false},
    "sender_id": {"name": "sender_id", "type": "string", "description": "NicoNico user ID of gift sender", "optional": false},
    "sender_name": {"name": "sender_name", "type": "string", "description": "Display name of the gift sender", "optional": false},
    "sender_avatar": {"name": "sender_avatar", "type": "string", "description": "URL to sender profile picture", "optional": true},
    "message": {"name": "message", "type": "string", "description": "Optional message attached to gift", "optional": true},
    "amount_value": {"name": "amount_value", "type": "number", "description": "Gift point value (e.g., 50)", "optional": false},
    "amount_currency": {"name": "amount_currency", "type": "string", "description": "Currency code (JPY for NicoNico)", "optional": false},
    "amount_display": {"name": "amount_display", "type": "string", "description": "Formatted display string (e.g., '50pt', '¥500')", "optional": false},
    "is_member": {"name": "is_member", "type": "boolean", "description": "Whether sender is a channel member/supporter", "optional": true},
    "badges": {"name": "badges", "type": "array", "description": "Array of badge descriptors (e.g., ['supporter', 'subscriber'])", "optional": true},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Note:** Gift amounts are tracked for monetization and viewer engagement tracking.

---

### GET /event-metadata/niconico/follow

**Response (example: GET /event-metadata/niconico/follow):**
```json
{
  "platform": "niconico",
  "event_type": "follow",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'follow' for this endpoint", "optional": false},
    "sender_id": {"name": "sender_id", "type": "string", "description": "NicoNico user ID of new follower", "optional": false},
    "sender_name": {"name": "sender_name", "type": "string", "description": "Display name of new follower", "optional": false},
    "sender_avatar": {"name": "sender_avatar", "type": "string", "description": "URL to follower profile picture", "optional": true},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

---

### GET /event-metadata/niconico/stream_start

**Response (example: GET /event-metadata/niconico/stream_start):**
```json
{
  "platform": "niconico",
  "event_type": "stream_start",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'stream_start' for this endpoint", "optional": false},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Note:** System event indicating a live stream has started. No sender information (applies to channel level).

---

### GET /event-metadata/niconico/stream_end

**Response (example: GET /event-metadata/niconico/stream_end):**
```json
{
  "platform": "niconico",
  "event_type": "stream_end",
  "fields": {
    "id": {"name": "id", "type": "string", "description": "Unique identifier (UUID) for this event", "optional": false},
    "user_id": {"name": "user_id", "type": "number", "description": "ID of the user who owns the watch target", "optional": false},
    "watch_target_id": {"name": "watch_target_id", "type": "string", "description": "ID of the watch target this event came from", "optional": false},
    "stream_event_id": {"name": "stream_event_id", "type": "string", "description": "ID of the parent stream_event", "optional": false},
    "platform": {"name": "platform", "type": "string", "description": "Platform name", "optional": false},
    "event_type": {"name": "event_type", "type": "string", "description": "Always 'stream_end' for this endpoint", "optional": false},
    "received_at": {"name": "received_at", "type": "timestamp", "description": "When the event was received from the platform", "optional": false},
    "created_at": {"name": "created_at", "type": "timestamp", "description": "When the event record was created in our database", "optional": false}
  }
}
```

**Note:** System event indicating a live stream has ended. No sender information (applies to channel level).

---

Provides metadata about platform capabilities and event parameters. Read-only queryable catalog. No authentication required for GET endpoints.

### GET /platform-config/platforms

List all supported platforms.

**Response `200`:**
```json
{
  "platforms": ["youtube", "twitch", "bilibili", "tiktok", "kick", "niconico"]
}
```

---

### GET /platform-config/platforms/{platform}/events

List event types for a platform.

**Example:** `GET /platform-config/platforms/youtube/events`

**Response `200`:**
```json
{
  "platform": "youtube",
  "events": ["comment", "superchat", "sticker", "member"]
}
```

---

### GET /platform-config/platforms/{platform}/events/{event}/parameters

Get all parameters for platform/event (all parameters are available for use in conditions).

**Response `200`:**
```json
{
  "platform": "youtube",
  "event": "superchat",
  "parameters": [
    { "name": "message", "type": "string", "available": true, "optional": false, "description": "Message text (always present)" },
    { "name": "channel_name", "type": "string", "available": true, "optional": true, "description": "Channel name (sometimes missing)" }
  ]
}
```

**Fields:**
- `available` (bool): Whether this parameter can be used in conditions (all parameters are always available)
- `optional` (bool): Whether this field is sometimes missing from events
  - `false` = guaranteed to be present in every event
  - `true` = sometimes missing (use null coalescing when building conditions)

---

### GET /platform-config/platforms/{platform}/events/{event}/parameters/available

Get available parameters (all parameters, for UI condition builder).

**Response `200`:** All parameters including both required and optional fields. Filter by `optional: false` in the response if you only want guaranteed-present fields.

**Example:**
```json
{
  "platform": "youtube",
  "event": "superchat",
  "parameters": [
    { "name": "message", "type": "string", "available": true, "optional": false },
    { "name": "channel_name", "type": "string", "available": true, "optional": true }
  ]
}
```

---

### GET /platform-config/platforms/{platform}/events/{event}/parameters/unavailable

Get only unavailable parameters with reasons (currently returns empty, reserved for future use).

**Response `200`:** Empty array (all parameters are currently available)

---

### GET /platform-config/platforms/{platform}/events/{event}/parameters/{param}/available

Check if specific parameter is available.

**Response `200`:**
```json
{
  "platform": "youtube",
  "event": "superchat",
  "parameter": "message",
  "available": true,
  "optional": false
}
```

---

### GET /platform-config/catalog

Get complete catalog (large response).

**Use case:** Offline documentation, bulk export.

**Response `200`:**
```json
{
  "status": "success",
  "message": "Platform catalog reloaded"
}
```

**Notes:**
- Catalog defined in `internal/config/platform_event_parameters.json`
- All parameters use `event_` prefix (e.g., `event_message`, `event_amount`)
- No database required
- All responses are JSON

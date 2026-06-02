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
  "provider": "google | twitch | niconico | instagram | tiktok | kick | facebook | x | bilibili",
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
> NicoNico, Instagram, TikTok, Kick, Facebook, X, and Bilibili OAuth are spec'd but not yet wired — the provider values are reserved for when those flows are implemented.

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
| Instagram | `http://localhost:8080/auth/callback/instagram` | `https://taucho.org/auth/callback/instagram` |
| Facebook | `http://localhost:8080/auth/callback/facebook` | `https://taucho.org/auth/callback/facebook` |

**Where to register each redirect URI:**
- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs
- **Twitch** — Twitch Developer Console → your app → OAuth Redirect URLs
- **Instagram** — Meta App Dashboard → Instagram → API setup with Instagram login → Set up Instagram business login → Business login settings → OAuth Redirect URIs
- **Facebook** — Same Meta App Dashboard → Facebook Login → Settings → Valid OAuth Redirect URIs

**What the API does:**
1. `GET /oauth/login?provider=X` — builds the auth URL using `{PROVIDER}_REDIRECT_URL` from env, returns `{ auth_url }`.
   - **Optional `return_url` param**: `GET /oauth/login?provider=X&return_url=<encoded-url>` — if provided, the API must embed it in the OAuth `state` parameter and redirect to it (instead of the default `/dashboard`) after the callback succeeds. The portal uses this to return to `/account-settings?connected=<provider>` so the page can show a success toast.
2. `GET /auth/callback/{provider}?code=...&state=...` — portal proxies this; API exchanges code, creates session, sets cookie, **redirects to `return_url` from state if present, otherwise `{PORTAL_BASE_URL}/dashboard`**.

**Required env vars on the API server (`api.taucho.org`):**
| Env var | Local value | Production value |
|---------|------------|-----------------|
| `PORTAL_BASE_URL` | `http://localhost:8080` | `https://taucho.org` |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/auth/callback/google` | `https://taucho.org/auth/callback/google` |
| `TWITCH_REDIRECT_URL` | `http://localhost:8080/auth/callback/twitch` | `https://taucho.org/auth/callback/twitch` |
| `INSTAGRAM_REDIRECT_URL` | `http://localhost:8080/auth/callback/instagram` | `https://taucho.org/auth/callback/instagram` |
| `FACEBOOK_REDIRECT_URL` | `http://localhost:8080/auth/callback/facebook` | `https://taucho.org/auth/callback/facebook` |

> ⚠️ **Instagram credentials** — `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` are the **Instagram App ID / Instagram App Secret** found in Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings. These are **not** the same as the main Facebook App ID shown under App Settings → Basic.

> ⚠️ **Facebook credentials** — `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` are the **main App ID / App Secret** from the same Meta app (App Settings → Basic). These are the same across Facebook and Instagram products on one Meta app — just use the top-level ones for Facebook Login.

---

## Data Storage

When `DATABASE_URL` is set, all resources (users, watches, conditions, devices, stream accounts) are persisted in PostgreSQL. If `DATABASE_URL` is not set, the service starts with in-memory stores (data is lost on restart) and auth/OAuth endpoints return `503`.

**User ownership** is enforced at the database layer — each watch, condition, device, and stream account has a `user_id` FK. Handlers pass the authenticated user's ID so each user sees only their own data.

**Poller cache** — the poller does not query the database on every poll cycle. Instead a `CachedWatchStore` holds an in-memory snapshot of active/live watches and refreshes it periodically (default every 5 minutes). `SetCurrentlyLive` writes through immediately; `UpdateLastChecked` only updates in-memory to minimise write traffic.

| Env var | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required for persistence) |
| `CACHE_REFRESH_INTERVAL` | `5m` | How often the poller reloads active watches from DB (e.g. `2m`, `10m`) |

> ⚠️ `GOOGLE_REDIRECT_URL` has **no default**. If it is not set on the API server, OAuth will be disabled rather than silently using localhost.  
> The API reads `PORTAL_BASE_URL` (preferred) or `UI_BASE_URL` (legacy fallback) to know where to redirect after a successful OAuth login. `Secure` cookie flag is automatically set to `true` when `PORTAL_BASE_URL` starts with `https://`.

### Email+password endpoints
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | `{ email, password, username }` | Creates `users` row with bcrypt hash. `username` must be unique. |
| POST | `/auth/login` | `{ identifier, password }` | `identifier` = username **or** email. Tries email first; falls back to username. Verifies bcrypt hash, creates session. |
| PATCH | `/auth/password` | `{ current_password, new_password }` | Change password. Requires `current_password` to match existing hash. Returns `204` on success. Returns `400` if `current_password` is wrong or `new_password` is too short. Returns `409` if the account has no password yet (OAuth-only account -- use a different flow to set initial password). |

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
| DELETE | `/auth/user` | Delete account + clear session cookie |
| POST | `/auth/login` | Email/username + password login, sets session cookie |
| POST | `/auth/register` | Create new email+password account |
| POST | `/auth/logout` | Log out, clear session |
| GET | `/oauth/login?provider=<p>` | Start OAuth login — returns `{ auth_url }`. `p` = `google`, `twitch`, `instagram`, or `facebook`. Optional `&return_url=<encoded>` redirects back to that URL after OAuth callback instead of `/dashboard`. |
| GET | `/auth/callback/google` | Google OAuth callback (proxied by portal) |
| GET | `/auth/callback/twitch` | Twitch OAuth callback (proxied by portal) |
| GET | `/auth/callback/instagram` | Instagram OAuth callback (proxied by portal) |
| GET | `/auth/callback/facebook` | Facebook OAuth callback (proxied by portal) |
| GET | `/auth/connections` | List all OAuth providers linked to the current account |
| DELETE | `/auth/connections/:provider` | Unlink an OAuth provider from the current account |

### Account Settings (`/auth/...`) -- not yet implemented
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/auth/user` | Update profile: `username` and/or `picture` (partially implemented -- see Known Limitations) |
| PATCH | `/auth/password` | Change password: `{ current_password, new_password }`. Returns `409` for OAuth-only accounts. |
| DELETE | `/auth/user` | Delete account + clear session cookie |

### Watched Channels (`/watches/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/watches` | List all watches for the authenticated user |
| GET | `/watches/get?id=<id>` | Get a single watch |
| POST | `/watches` | Create a new watched channel |
| PATCH | `/watches/update?id=<id>` | Update `name` and/or `is_active` |
| DELETE | `/watches?id=<id>` | Delete a watch (also removes its conditions) |

### Stream Events (`/stream-events/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stream-events` | List events for user (`?limit=N`, `?watch_id=<id>`) |
| GET | `/stream-events/get?id=<id>` | Get a single stream event |

### Conditions (`/conditions/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/conditions?watch_id=<id>` | List all conditions for a watched channel |
| GET | `/conditions/get?id=<id>` | Get a single condition |
| POST | `/conditions` | Create a condition |
| PATCH | `/conditions/update?id=<id>` | Update a condition |
| DELETE | `/conditions?id=<id>` | Delete a condition |

### Devices (`/devices/...`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all devices (credentials omitted) |
| GET | `/devices/get?id=<id>` | Get a single device (includes credentials) |
| POST | `/devices` | Register a device |
| PATCH | `/devices/update?id=<id>` | Update a device |
| DELETE | `/devices?id=<id>` | Delete a device |
| POST | `/devices/test?id=<id>` | Send a brief test command (stub — needs brand SDK) |

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

## 🔲 Not Yet Implemented

> All endpoints listed in this spec are now implemented, **except the Platform Channel Discovery section below**.
> See the Known Limitations section above for in-progress items (device test stub, stream metrics, session cookie auth).

---

## Platform Channel Discovery

Used by the **Add Channel** page (`/add-channel`) to browse and search real channels via linked OAuth accounts.  
All endpoints require authentication and rely on the user's stored OAuth tokens (refreshed automatically by the API server).  
Respond with `501 Not Implemented` until the endpoint is ready — the portal UI handles this gracefully.

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
Response: same shape as following (`{ items: [...], cursor: "..." }`).

---

### NicoNico (`/platform/niconico/...`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/niconico/channels/mine` | NicoNico user channel info |
| GET | `/platform/niconico/search?q=` | Channel / user search (if NicoNico provides a public API) |

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
- Only implement if NicoNico exposes a public search API.  
- Return `501 Not Implemented` otherwise.  
- Response: `{ items: [...] }` using same channel object shape.

---

### Error responses for all `/platform/...` endpoints

| Status | Meaning |
|--------|---------|
| 401 | Not authenticated |
| 403 | OAuth scope insufficient (e.g. Twitch `user:read:follows` missing) |
| 404 | User has no linked account for this platform |
| 501 | Endpoint not yet implemented |
| 502 | Upstream platform API error |

<!-- Keeping the original endpoint schemas below for reference -->

### Watched Channels — full CRUD (`/watches/...`)

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
  "last_stream_at": "2026-05-25T14:00:00Z"
}
```

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/watches` | — | List all watches for the authenticated user |
| POST | `/watches` | `{ name, platform, channel_id, is_active }` | Create a new watched channel |
| DELETE | `/watches?id=<id>` | — | Delete a watch (also removes its conditions) |

> `GET /watches/get` and `PATCH /watches/update` already exist — just need list + create + delete.

---

### Conditions (`/conditions/...`)

Conditions belong to a watched channel. When the API polling service detects a matching
stream event, it can trigger a device action.

**Condition object:**
```json
{
  "id": "string (nano-time ID, e.g. \"cond_1748500000000\")",
  "watch_id": "string (FK → watches.id)",
  "name": "string",
  "event_type": "comment | superchat | sticker | member | follow | sub | cheer | gift | nicoru | like | hype_train | raid | stream_start | stream_end",
  "filter": "string (optional keyword; empty = match all)",
  "is_enabled": true,
  "device_id": "string | null (FK → devices.id)",
  "device_action": "on | off | toggle | color | brightness | color_temp | scene | flash | null",
  "device_action_params": {
    "color": "#ff0000",
    "brightness": 75
  },
  "last_triggered_at": "2026-05-25T14:08:00Z | null"
}
```

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/conditions?watch_id=<id>` | — | List all conditions for a watched channel |
| GET | `/conditions/get?id=<id>` | — | Get a single condition |
| POST | `/conditions` | `{ watch_id, name, event_type, filter?, is_enabled, device_id?, device_action?, device_action_params? }` | Create a condition |
| PATCH | `/conditions/update?id=<id>` | any subset of `{ name, event_type, filter, is_enabled, device_id, device_action, device_action_params }` | Update a condition |
| DELETE | `/conditions?id=<id>` | — | Delete a condition |

**Platform-specific event types the portal uses:**

| Platform | Event types |
|----------|-------------|
| YouTube | `comment`, `superchat`, `sticker`, `member`, `stream_start`, `stream_end` |
| Twitch | `comment`, `cheer`, `follow`, `sub`, `hype_train`, `raid`, `stream_start`, `stream_end` |
| NicoNico | `comment`, `nicoru`, `gift`, `follow`, `stream_start`, `stream_end` |
| Instagram | `comment`, `like`, `follow`, `gift`, `stream_start`, `stream_end` |
| TikTok | `comment`, `like`, `follow`, `gift`, `stream_start`, `stream_end` |
| Kick | `comment`, `follow`, `sub`, `raid`, `stream_start`, `stream_end` |
| Facebook | `comment`, `like`, `follow`, `stream_start`, `stream_end` |
| X (Twitter) | `comment`, `like`, `follow`, `stream_start`, `stream_end` |
| Bilibili | `comment`, `gift`, `follow`, `stream_start`, `stream_end` |

---

### Devices (`/devices/...`)

Registered smart home devices. Credentials are stored per-brand.

**Device object:**
```json
{
  "id": "string (nano-time ID, e.g. \"device_1748500000000\")",
  "user_id": "integer",
  "name": "string",
  "brand": "govee | hue | kasa | lifx | tuya | nanoleaf | yeelight | wled | wyze | amazon",
  "product_id": "string (e.g. govee-h6159, hue-color)",
  "room": "string (optional)",
  "is_configured": true,
  "status": "online | offline | unknown",
  "credentials": "object (shape varies by brand — see below; omitted in list responses)"
}
```

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

> **Storage note:** `credentials` is stored as a JSONB column in PostgreSQL. The flat layout (no brand nesting) is intentional — brand is a separate column and nesting would be redundant.  
> **Security note:** Credentials contain API keys and local IPs. Omit or mask the `credentials` field from `GET /devices` list responses; include it only in `GET /devices/get?id=<id>`.

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/devices` | — | List all devices for the authenticated user (`credentials` omitted) |
| GET | `/devices/get?id=<id>` | — | Get a single device (includes `credentials`) |
| POST | `/devices` | `{ name, brand, product_id, room?, credentials }` | Register a device |
| PATCH | `/devices/update?id=<id>` | any subset of `{ name, product_id, room, credentials }` | Update a device |
| DELETE | `/devices?id=<id>` | — | Delete a device (conditions using it should have device_id cleared) |
| POST | `/devices/test?id=<id>` | — | Send a brief test command to the physical device (flash/ping) |

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

## Summary Checklist

| Resource | List | Get | Create | Update | Delete | Other |
|----------|------|-----|--------|--------|--------|-------|
| Auth/User | — | ✅ | — | ✅ | ✅ | ✅ logout, ✅ oauth |
| NicoNico | — | ✅ status | — | — | ✅ disconnect | ✅ login, ✅ mfa |
| Watches | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Stream Events | ✅ | ✅ | — | — | — | — |
| Conditions | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Devices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ test (stub) |
| Streams | ✅ | ✅ | ✅ | ✅ | ✅ | — |

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


- **OAuth providers**: Google (YouTube), Twitch, Instagram, and Facebook OAuth are implemented. NicoNico, TikTok, Kick, X, and Bilibili provider values are reserved — login buttons may show on the portal but those flows are not yet wired.
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

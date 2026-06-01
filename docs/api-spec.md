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
> NicoNico, TikTok, Kick, X, and Bilibili OAuth are spec'd but not yet wired — the provider values are reserved for when those flows are implemented.

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
2. `GET /auth/callback/{provider}?code=...&state=...` — portal proxies this; API exchanges code, creates session, sets cookie, **redirects to `{PORTAL_BASE_URL}/dashboard`**.

**Required env vars on the API server (`api.taucho.org`):**
| Env var | Local value | Production value |
|---------|------------|-----------------|
| `PORTAL_BASE_URL` | `http://localhost:8080` | `https://taucho.org` |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/auth/callback/google` | `https://taucho.org/auth/callback/google` |
| `TWITCH_REDIRECT_URL` | `http://localhost:8080/auth/callback/twitch` | `https://taucho.org/auth/callback/twitch` |
| `INSTAGRAM_REDIRECT_URL` | `http://localhost:8080/auth/callback/instagram` | `https://taucho.org/auth/callback/instagram` |
| `FACEBOOK_REDIRECT_URL` | `http://localhost:8080/auth/callback/facebook` | `https://taucho.org/auth/callback/facebook` |

> ⚠️ **Instagram credentials** — `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` are the **Instagram App ID / Instagram App Secret** found in Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings. These are **not** the same as the main Facebook App ID shown under App Settings → Basic.

> ⚠️ **Facebook credentials** — `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` are the **App ID / App Secret** found in Meta App Dashboard → App Settings → Basic.

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

### Auth/connections endpoints
| Method | Path | Response | Description |
|--------|------|----------|-------------|
| GET | `/auth/connections` | `[{ provider, provider_email, provider_username, provider_channel_name, connected_at }]` | List linked OAuth providers. Fields `provider_email`, `provider_username`, `provider_channel_name` are nullable. |
| DELETE | `/auth/connections/:provider` | `204` | Unlink provider (must keep ≥1 login method) |

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
| GET | `/oauth/login?provider=<p>` | Start OAuth login — returns `{ auth_url }`. `p` = `google`, `twitch`, `instagram`, or `facebook` |
| GET | `/auth/callback/google` | Google OAuth callback (proxied by portal) |
| GET | `/auth/callback/twitch` | Twitch OAuth callback (proxied by portal) |
| GET | `/auth/callback/instagram` | Instagram OAuth callback (proxied by portal) |
| GET | `/auth/callback/facebook` | Facebook OAuth callback (proxied by portal) |
| GET | `/auth/connections` | List all OAuth providers linked to the current account |
| DELETE | `/auth/connections/:provider` | Unlink an OAuth provider from the current account |

### Account Settings (`/auth/...`)
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/auth/user` | Update profile: `username` and/or `picture` |
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

> All endpoints listed in this spec are now implemented. See the Known Limitations section above for in-progress items (device test stub, stream metrics, session cookie auth).

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

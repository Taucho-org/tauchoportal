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
```json
{
  "id": "uuid",
  "user_id": "uuid (FK → users.id)",
  "provider": "google | github | discord | twitch",
  "provider_user_id": "string (unique per provider)",
  "provider_email": "string (email returned by the OAuth provider)",
  "access_token": "string (encrypted at rest)",
  "refresh_token": "string (encrypted, nullable)",
  "token_expires_at": "timestamp (nullable)",
  "connected_at": "timestamp"
}
```
Unique constraint: `(provider, provider_user_id)` — one account per provider.

### OAuth login flow
| Scenario | Behaviour |
|---|---|
| Not logged in, OAuth email matches existing user | Log in as that user; link provider if not already linked |
| Not logged in, OAuth email is new | Create `users` row (no password), create `oauth_connections` row, start session |
| Already logged in, provider not yet linked | Add `oauth_connections` row to current user |
| Already logged in, provider already linked to a **different** account | Return error `409 Conflict` |

### OAuth redirect URI setup

The portal handles the OAuth callback — Google redirects the user's browser to the **portal**, which proxies the request to the API.

**Callback path:** `{PORTAL_BASE_URL}/auth/callback/{provider}`  
e.g. `http://localhost:8080/auth/callback/google` (local) · `https://taucho.org/auth/callback/google` (prod)

**What the API must do:**
1. `GET /oauth/login?provider=X` — build the auth URL using `GOOGLE_REDIRECT_URL` (or `{provider}_REDIRECT_URL`) from env, return `{ auth_url }`.
2. `GET /auth/callback/google?code=...&state=...` — exchange code, create session, set cookie, **redirect to `{PORTAL_BASE_URL}/dashboard`**.

**Required env vars on the API server:**
| Env var | Local value | Production value |
|---------|------------|-----------------|
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/auth/callback/google` | `https://taucho.org/auth/callback/google` |
| `PORTAL_BASE_URL` | `http://localhost:8080` | `https://taucho.org` |

**Google Cloud Console — Authorized redirect URIs** (OAuth 2.0 Client settings):
- `http://localhost:8080/auth/callback/google`
- `https://taucho.org/auth/callback/google`

> ⚠️ Currently the API has `GOOGLE_REDIRECT_URL` hardcoded to `localhost:8080`. This must be an env var so production deployments use the correct URL.

### Email+password endpoints
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | `{ email, password, username }` | Creates `users` row with bcrypt hash. `username` must be unique. |
| POST | `/auth/login` | `{ identifier, password }` | `identifier` = username **or** email. Look up by email first; if no match, look up by username. Verifies bcrypt hash, creates session. |

### Auth/connections endpoints
| Method | Path | Response | Description |
|--------|------|----------|-------------|
| GET | `/auth/connections` | `[{ provider, provider_email, connected_at }]` | List linked OAuth providers |
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
| POST | `/auth/login` | Email + password login, sets session cookie |
| POST | `/auth/register` | Create new email+password account |
| POST | `/auth/logout` | Log out, clear session |
| GET | `/oauth/login?provider=<p>` | Start OAuth login for `google`, `github`, `discord`, or `twitch` — returns `{ auth_url }` |
| GET | `/auth/connections` | List all OAuth providers linked to the current account |
| DELETE | `/auth/connections/:provider` | Unlink an OAuth provider from the current account |

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
  "id": "string",
  "user_id": "string",
  "name": "string",
  "platform": "youtube | twitch | niconico",
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
  "id": "string",
  "watch_id": "string",
  "name": "string",
  "event_type": "comment | superchat | sticker | member | follow | sub | cheer | gift | nicoru | hype_train | raid | stream_start | stream_end",
  "filter": "string (optional keyword; empty = match all)",
  "is_enabled": true,
  "device_id": "string | null",
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

---

### Devices (`/devices/...`)

Registered smart home devices. Credentials are stored per-brand.

**Device object:**
```json
{
  "id": "string",
  "user_id": "string",
  "name": "string",
  "brand": "govee | hue | kasa | lifx | tuya | nanoleaf | yeelight | wled | wyze | amazon",
  "product_id": "string (e.g. govee-h6159, hue-color)",
  "room": "string (optional)",
  "is_configured": true,
  "status": "online | offline | unknown",
  "credentials": {
    "govee":     { "api_key": "...", "device_id": "..." },
    "hue":       { "bridge_ip": "...", "api_key": "...", "light_id": "..." },
    "kasa":      { "device_ip": "..." },
    "lifx":      { "api_key": "...", "selector": "..." },
    "tuya":      { "client_id": "...", "client_secret": "...", "device_id": "...", "region": "..." },
    "nanoleaf":  { "device_ip": "...", "api_key": "..." },
    "yeelight":  { "device_ip": "..." },
    "wled":      { "device_ip": "..." },
    "wyze":      { "api_key": "...", "api_key_id": "...", "device_mac": "..." },
    "amazon":    { "endpoint_id": "..." }
  }
}
```

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | `/devices` | — | List all devices for the authenticated user |
| GET | `/devices/get?id=<id>` | — | Get a single device |
| POST | `/devices` | `{ name, brand, product_id, room?, credentials }` | Register a device |
| PATCH | `/devices/update?id=<id>` | any subset of `{ name, product_id, room, credentials }` | Update a device |
| DELETE | `/devices?id=<id>` | — | Delete a device (conditions using it should have device_id cleared) |
| POST | `/devices/test?id=<id>` | — | Send a brief test command to the physical device (flash/ping) |

> **Security note:** `credentials` contains API keys and local IPs. These should be stored
> encrypted at rest and never returned in list responses — omit or mask the `credentials` field
> from GET list responses, include it only in `GET /devices/get?id=<id>`.

---

### Streams (`/streams/...`)

The user's own streaming accounts — the channels they stream *from* (YouTube, Twitch, NicoNico).
Distinct from **watched channels** (which are channels they monitor *for events*).

**Stream object:**
```json
{
  "id": "string",
  "user_id": "string",
  "name": "string",
  "platform": "youtube | twitch | niconico",
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

## Known Limitations / TODOs

- **`X-User-ID` auth**: All watch/condition/device/stream handlers use `X-User-ID` header as a placeholder. Production should read from session cookie via `sessionMgr.GetUserIDFromCookie()`.
- **Device test stub**: `POST /devices/test?id=` acknowledges the request but doesn't call the actual device SDK. Each `brand` needs its own implementation.
- **Stream metrics**: `GET /streams/get` returns the full stream account but not live metrics (viewers/bitrate/fps). A separate polling integration or `GET /streams/metrics?id=` would be needed.
- **Database persistence**: All stores are in-memory. SQL store implementations needed to persist across restarts.

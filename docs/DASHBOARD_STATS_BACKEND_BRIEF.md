# Dashboard Stats Endpoint - Backend Implementation Brief

**Status:** REQUIRED - Blocking UI dashboard from displaying data

## Quick Summary
Implement a single API endpoint that returns all dashboard data (stats, activity feed, channel list, device list) in one response. This endpoint is called by the UI server on every dashboard page load.

---

## Endpoint Specification

### Request
```
GET /dashboard/stats
Header: X-User-ID: {user_id}
```

### Response Status
- **200 OK** - Success
- **401 Unauthorized** - Missing or invalid X-User-ID
- **500 Internal Server Error** - Database or processing error

---

## Response Schema (JSON)

```json
{
  "stats": {
    "channels": {
      "total": 12,
      "live": 3,
      "change": 2,
      "change_percent": 16.7
    },
    "devices": {
      "total": 8,
      "online": 7,
      "offline": 1,
      "warning": 0
    },
    "conditions": {
      "total": 45,
      "enabled": 40,
      "triggers_today": 47,
      "triggers_change": -5
    }
  },
  "activity": [
    {
      "id": "event-123",
      "type": "stream_start",
      "title": "Channel name's stream started",
      "detail": "Additional context or platform info",
      "channel_name": "Channel name (if applicable)",
      "device_name": "Device name (if applicable)",
      "status": "streaming|offline|online|success|warning|error",
      "timestamp": "2026-07-20T01:15:30Z",
      "icon": "🎬"
    }
  ],
  "channels_status": [
    {
      "id": "watch_id",
      "name": "Channel name",
      "platform": "twitch|youtube|bilibili|niconico",
      "status": "live|offline",
      "last_stream": "2026-07-20T01:15:30Z",
      "thumbnail_url": "https://..."
    }
  ],
  "devices_status": [
    {
      "id": "device_id",
      "name": "Device name",
      "brand": "Brand name",
      "status": "online|offline|warning",
      "room": "Room name",
      "last_seen": "2026-07-20T01:19:30Z",
      "thumbnail_url": "https://..."
    }
  ]
}
```

---

## Field Details

### Stats Section
| Field | Type | Description |
|-------|------|-------------|
| `stats.channels.total` | int | Total number of watched channels |
| `stats.channels.live` | int | Number currently streaming |
| `stats.channels.change` | int | Net change in total channels (24h) |
| `stats.channels.change_percent` | float | Percentage change (24h) |
| `stats.devices.total` | int | Total connected devices |
| `stats.devices.online` | int | Number currently online |
| `stats.devices.offline` | int | Number currently offline |
| `stats.devices.warning` | int | Number with warnings (timeout, etc) |
| `stats.conditions.total` | int | Total conditions/rules |
| `stats.conditions.enabled` | int | Number currently enabled |
| `stats.conditions.triggers_today` | int | Total triggers in last 24h |
| `stats.conditions.triggers_change` | int | Difference vs previous 24h (neg=fewer) |

### Activity Feed
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event ID |
| `type` | string | `stream_start`, `stream_end`, `condition_triggered`, `device_offline`, `device_online`, `condition_error` |
| `title` | string | Human-readable title (max 80 chars) |
| `detail` | string | Additional context (max 120 chars) |
| `channel_name` | string | (optional) Channel involved |
| `device_name` | string | (optional) Device involved |
| `status` | string | `streaming`, `offline`, `online`, `success`, `warning`, `error` |
| `timestamp` | string | ISO 8601 UTC (e.g., "2026-07-20T01:15:30Z") |
| `icon` | string | Single emoji (🎬, ⚡, 💡, 👁️, 🚨, etc) |

### Channels Status List
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Watch/Channel record ID |
| `name` | string | Display name |
| `platform` | string | `twitch`, `youtube`, `bilibili`, `niconico`, `custom` |
| `status` | string | `live`, `offline` |
| `last_stream` | string | ISO 8601 UTC timestamp of last stream start |
| `thumbnail_url` | string | (optional) Channel thumbnail URL for UI display |

### Devices Status List
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Device record ID |
| `name` | string | Display name |
| `brand` | string | Device brand (Govee, Nanoleaf, Kasa, etc) |
| `status` | string | `online`, `offline`, `warning` (no response > 15min) |
| `room` | string | Room/location name |
| `last_seen` | string | ISO 8601 UTC timestamp of last contact |
| `thumbnail_url` | string | (optional) Device thumbnail URL for UI display |

---

## Data Limits

- **Activity feed:** Return 10-20 most recent items (sorted newest first)
- **Channels list:** Return up to 5-10 channels (prioritize recently active)
- **Devices list:** Return up to 5-10 devices (prioritize recently active)

---

## Error Handling

Return empty arrays/zero values if:
- User has no watched channels → `channels_status: []`, `stats.channels.total: 0`
- User has no devices → `devices_status: []`, `stats.devices.total: 0`
- No recent activity → `activity: []`

**Do NOT fail the entire endpoint.** Return a 200 with partial data.

---

## Data Sources

Pull data from:
1. **Watches** table → Channels stats & channels_status list
2. **Devices** table + device health checks → Devices stats & devices_status list
3. **Conditions** table → Conditions stats
4. **Stream Events** table → Channel live/offline status, activity feed
5. **Device Events** or status logs → Device offline/online events, activity feed
6. **Condition Execution Log** → Triggers today, activity feed for condition events

---

## Example Usage Flow

1. User navigates to `/dashboard`
2. UI Server (`templates/pages/dashboard.html`) renders
3. During render, Go calls `controller.PrepareDashboardPageData()`
4. Controller calls `GET /dashboard/stats` to this endpoint
5. Response is injected into template as `.Dashboard`
6. Template renders stats, activity, channels, devices with live data

---

## Testing Checklist

- [ ] Returns 200 with valid JSON when user_id is valid
- [ ] Returns 401 when X-User-ID header missing
- [ ] Activity items are sorted newest-first
- [ ] Timestamps are valid ISO 8601 UTC format
- [ ] Numbers are realistic (live <= total, online <= total, etc)
- [ ] Empty lists when user has no data (not null, not error)
- [ ] All field names match exactly (snake_case, no typos)
- [ ] Response time < 500ms (single DB query or cached)

---

## Reference
Full spec with examples: `/docs/DASHBOARD_API_SPEC.md`
Frontend template: `/templates/pages/dashboard.html`
Frontend controller: `/internal/controller/dashboard.go`

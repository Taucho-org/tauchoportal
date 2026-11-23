# Dashboard API Endpoint Specification

## Endpoint
`GET /dashboard/stats`

## Purpose
Returns comprehensive dashboard data including metrics, activity feed, and status summaries.

## Response Schema

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
      "title": "Pokimane's stream started",
      "detail": "Channel: Pokimane • Platform: Twitch",
      "channel_name": "Pokimane",
      "status": "streaming",
      "timestamp": "2026-07-20T01:15:30Z",
      "icon": "🎬"
    },
    {
      "id": "cond-456",
      "type": "condition_triggered",
      "title": "5 conditions triggered",
      "detail": "Actions: 3 device commands, 2 webhooks",
      "status": "success",
      "timestamp": "2026-07-20T01:10:15Z",
      "icon": "⚡"
    },
    {
      "id": "dev-789",
      "type": "device_offline",
      "title": "LED Controller offline",
      "detail": "Device: Living Room RGB • No response for 15 min",
      "device_name": "Living Room RGB",
      "status": "warning",
      "timestamp": "2026-07-20T01:02:00Z",
      "icon": "💡"
    },
    {
      "id": "evt-999",
      "type": "stream_end",
      "title": "sykkuno's stream ended",
      "detail": "Channel: sykkuno • Duration: 4h 32m",
      "channel_name": "sykkuno",
      "status": "offline",
      "timestamp": "2026-07-20T00:42:00Z",
      "icon": "👁️"
    },
    {
      "id": "err-111",
      "type": "condition_error",
      "title": "Condition error: API timeout",
      "detail": "Rule: 'Chat mentions' on Valkyrae channel failed",
      "status": "error",
      "timestamp": "2026-07-20T00:10:00Z",
      "icon": "🚨"
    }
  ],
  "channels_status": [
    {
      "id": "watch-1",
      "name": "Pokimane",
      "platform": "twitch",
      "status": "live",
      "last_stream": "2026-07-20T01:15:30Z"
    },
    {
      "id": "watch-2",
      "name": "sykkuno",
      "platform": "twitch",
      "status": "offline",
      "last_stream": "2026-07-20T00:42:00Z"
    },
    {
      "id": "watch-3",
      "name": "valkyrae",
      "platform": "twitch",
      "status": "live",
      "last_stream": "2026-07-20T00:55:20Z"
    },
    {
      "id": "watch-4",
      "name": "scarra",
      "platform": "twitch",
      "status": "live",
      "last_stream": "2026-07-20T00:30:15Z"
    },
    {
      "id": "watch-5",
      "name": "toast",
      "platform": "youtube",
      "status": "offline",
      "last_stream": "2026-07-19T22:15:00Z"
    }
  ],
  "devices_status": [
    {
      "id": "dev-1",
      "name": "Living Room RGB",
      "brand": "Govee",
      "status": "warning",
      "room": "Living Room",
      "last_seen": "2026-07-20T00:45:00Z"
    },
    {
      "id": "dev-2",
      "name": "Desk Lamp",
      "brand": "Nanoleaf",
      "status": "online",
      "room": "Office",
      "last_seen": "2026-07-20T01:18:00Z"
    },
    {
      "id": "dev-3",
      "name": "Nanoleaf Panel",
      "brand": "Nanoleaf",
      "status": "online",
      "room": "Gaming Room",
      "last_seen": "2026-07-20T01:19:00Z"
    },
    {
      "id": "dev-4",
      "name": "Smart Plug 1",
      "brand": "Kasa",
      "status": "online",
      "room": "Living Room",
      "last_seen": "2026-07-20T01:19:30Z"
    },
    {
      "id": "dev-5",
      "name": "Smart Plug 2",
      "brand": "Kasa",
      "status": "online",
      "room": "Bedroom",
      "last_seen": "2026-07-20T01:18:45Z"
    }
  ]
}
```

## Notes

1. **Activity Feed Types:**
   - `stream_start`: A watched channel started streaming
   - `stream_end`: A watched channel stopped streaming
   - `condition_triggered`: One or more conditions fired
   - `device_offline`: A device went offline
   - `condition_error`: A condition failed to execute
   - `device_online`: A device came back online

   The portal localizes titles, details, and status labels for these known
   activity types. Keep the `type`, `channel_name`, `device_name`, and `status`
   fields populated. For compatibility with the current response shape, the
   portal also extracts supplemental values (such as platform, duration, and
   action counts) from the documented `title` and `detail` examples above.
   New activity types should provide structured fields for any display values
   rather than relying on English prose.

2. **Activity Status Values:**
   - `streaming`, `offline`, `online`, `success`, `warning`, `error`

3. **Stats Calculations:**
   - `change`: Difference from previous period (typically last 24 hours)
   - `change_percent`: Percentage change
   - `triggers_change`: Positive = more triggers, negative = fewer triggers

4. **Response should be limited to:**
   - Recent 10-20 activity items
   - Recent 5 channels with status
   - Recent 5 devices with status

5. **Ordering:**
   - Activity: newest first (reverse chronological)
   - Channels: alphabetical or by activity
   - Devices: alphabetical or by activity

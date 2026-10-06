# DeviceGroup API Naming Update

## Overview
This update clarifies the DeviceGroup API by renaming two confusing field names to better represent their actual purposes. The values and functionality remain exactly the same.

## Field Renaming

| Old Name | New Name | Values | Purpose |
|----------|----------|--------|---------|
| `type` | `device_targeting` | `ALL`, `ROUND_ROBIN`, `USER_AFFINITY` | Which device(s) receive the action |
| `option` | `concurrency_mode` | `exclusive`, `queued` | How to handle multiple triggers |

## Before and After Examples

### Request Body (Create Device Group)
**Before:**
```json
{
  "name": "Living Room Group",
  "type": "PARALLEL",
  "option": "sequential"
}
```

**After:**
```json
{
  "name": "Living Room Group",
  "device_targeting": "ALL",
  "concurrency_mode": "exclusive"
}
```

### Response Body
**Before:**
```json
{
  "id": "group_123",
  "name": "Living Room Group",
  "type": "PARALLEL",
  "option": "sequential",
  "devices": [...],
  "created_at": "2024-01-01T00:00:00Z"
}
```

**After:**
```json
{
  "id": "group_123",
  "name": "Living Room Group",
  "device_targeting": "ALL",
  "concurrency_mode": "exclusive",
  "devices": [...],
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Value Mappings

### device_targeting (previously "type")
- `ALL` (was `PARALLEL`) - Send action to all devices in group simultaneously
- `ROUND_ROBIN` (was `SEQUENTIAL`) - Round-robin targeting; each trigger goes to next device
- `USER_AFFINITY` (was `AFFINITY`) - Same user always gets same device from group

### concurrency_mode (previously "option")
- `exclusive` (was `sequential`) - Reject new triggers while previous is executing
- `queued` (was `queue`) - Queue triggers and execute them sequentially

## Affected Endpoints

All device group endpoints now use the new field names:
- `POST /device-groups` - Create device group
- `GET /device-groups` - List device groups
- `GET /device-groups/get?id=<id>` - Get single device group
- `PATCH /device-groups/update?id=<id>` - Update device group

## Migration Notes

- This is a **JSON field name change only** — no backend logic changes
- Update your request/response parsing to use the new field names
- Value enums remain unchanged (e.g., `exclusive` and `queued` are still valid)
- No database migration needed on your side — the API automatically handles the translation

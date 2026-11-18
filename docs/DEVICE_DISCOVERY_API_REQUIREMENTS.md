# Device Discovery API Requirements

The backend team confirmed that the existing discovery endpoint returns devices from the user's brand account, including devices already registered in Taucho. No new endpoint is needed. The devices page now omits results marked `already_registered` and also compares provider device IDs with the current user's locally registered device identifiers as a defensive fallback.

The frontend calls these existing endpoints when the user expands a connected brand:

1. `POST /devices/discover?brand={brand_id}` with `{}` as the request body.
2. `POST /devices/import-from-brand` with `{"brand":"{brand_id}","device_ids":["{brand_device_id}"]}`.

## Discovery response

Return devices visible to the authenticated user's connected brand account, including those already registered in Taucho. Include an `already_registered` flag when available.

```json
{
  "brand": "switchbot",
  "discovered_devices": [
    {
      "brand_device_id": "stable-provider-device-id",
      "brand_device_name": "Living Room Bot",
      "brand_device_type": "bot",
      "online": true,
      "already_registered": false,
      "mapped_product_id": "switchbot-bot"
    }
  ],
  "already_registered_count": 0,
  "can_be_imported_count": 1
}
```

`brand_device_id` must be stable and unique within the brand account. Do not return credentials or provider secrets.

## Import request and response

Import creates the selected Taucho device records; the client refreshes the devices page after success.

```json
{
  "brand": "switchbot",
  "device_ids": ["stable-provider-device-id"]
}
```

Return per-device results so partial success is explicit:

```json
{
  "brand": "switchbot",
  "imported": [
    {
      "success": true,
      "local_device_id": "taucho-device-id",
      "brand_device_id": "stable-provider-device-id",
      "name": "Living Room Bot",
      "product_id": "switchbot-bot",
      "status": "connected"
    }
  ],
  "failed": [],
  "skipped": [],
  "total_count": 1
}
```

Import must verify that each provider device belongs to the authenticated user's brand account and must be idempotent: a device that has become registered since discovery should be returned as skipped, not duplicated. Each imported device should retain its provider ID in `device_identifier` so later control requests target the correct physical device.

For disconnected brands, unsupported providers, and provider/API failures, return a non-2xx response with a JSON error message. The frontend only requests discovery for connected brands and should be able to display the error without treating it as an empty successful result.

## Integration expectations

- Discovery is supported per `brand_id` using the user's saved brand credentials.
- Import creates usable Taucho device records with the correct product mapping, identifiers, capabilities, and status.
- Repeated import attempts cannot create duplicate devices.
- Empty results return `discovered_devices: []`; provider errors are reported as errors, not empty success.

# Condition schema localization

Condition-event fields use platform-specific localization keys:

```text
condition.schema.{platform}.{field}.label
condition.schema.{platform}.{field}.description
```

For example, a TikTok gift's name uses:

```text
condition.schema.tiktok.gift_name.label
condition.schema.tiktok.gift_name.description
```

The condition editor obtains the platform and available fields from the platform-config API, then resolves the label with this key format. This keeps labels and descriptions in the same namespace and allows a field with platform-specific meaning to have its own wording.

The locale files cover only the platform/field combinations in `docs/live_event_and_property_keys.txt`, plus the shared LiveEvent fields that are available for every platform. A field must not be added to another platform merely because it has the same name. If the API adds an unlocalized field, the portal shows the API-provided description instead of an untranslated key.

The legacy `condition.eventProp.*`, `condition.{platform}.*`, and flat condition-field label keys were removed because they had overlapping meanings and no remaining runtime consumers.

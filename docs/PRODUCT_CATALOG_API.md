# Localized storefront catalog API

Use this endpoint for the enriched records in `product_catalog` and its images, localizations, and offers. The existing `/catalog/products` endpoints return the separate device `products` catalog.

## Request

```http
GET /catalog/storefront/products?language=en&currency=USD
```

Optional query parameters:

| Parameter | Default | Description |
|---|---|---|
| `language` | `en` | Requested localization code, such as `en`, `de`, `fr`, `es`, `jp`, `kr`, or `zh`. Uses English if the requested localization is unavailable. |
| `currency` | `USD` | Three-letter currency code. No currency conversion is performed. |
| `brand_id` | all brands | Limit results to a brand, e.g. `taucho`. |
| `active_only` | `true` | Set to `false` to include inactive catalog entries. |

Images are ordered by `position`. Offers are limited to the requested currency, with older captures of the same offer collapsed to the latest capture. When there is no matching offer, `price` can use the catalog's base price only if its currency matches the request; otherwise `price` and `currency` are `null`.

The product's `language_code` reports the localization actually used. If neither the requested localization nor English exists, `name` falls back to `source_product_key` and `description` is `null`.

## Response

```json
{
  "language": "en",
  "currency": "USD",
  "products": [
    {
      "id": 289,
      "brand_id": "taucho",
      "source_product_key": "api-mirror-ball",
      "source_url": "https://taucho.org/shopping/mirrorball",
      "category": "Live streaming support gadgets",
      "is_active": true,
      "created_at": "2026-11-25T21:57:18.992634Z",
      "updated_at": "2026-11-25T21:57:18.992634Z",
      "name": "API Mirror Ball",
      "language_code": "en",
      "description": "Bring classic dance-floor sparkle into your setup with the API Mirror Ball.",
      "price": 80,
      "compare_at_price": null,
      "currency": "USD",
      "discount_percent": null,
      "campaign_name": null,
      "images": [
        {
          "id": 1999,
          "image_url": "/image/catalog/taucho/mirrorball.png",
          "position": 0
        }
      ],
      "offers": [
        {
          "id": 542,
          "offer_name": null,
          "price": 80,
          "compare_at_price": null,
          "currency": "USD",
          "discount_percent": null,
          "valid_from": null,
          "valid_until": null,
          "source_url": "https://taucho.org/shopping/mirrorball",
          "captured_at": "2026-11-25T00:00:00Z"
        }
      ]
    }
  ]
}
```

List-valued fields (`products`, `images`, and `offers`) are returned as empty arrays when there are no matching records.

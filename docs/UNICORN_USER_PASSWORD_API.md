# Unicorn password connection: frontend API contract

The Taucho API endpoint is implemented. Use this endpoint to connect an
existing Unicorn account to the currently signed-in Taucho user. The method is
**POST**, not GET: the Unicorn password must be sent in a JSON body, never in a
URL.

## Connect or reconnect

```http
POST /auth/brand/unicorn/connect-sso
Content-Type: application/json
Cookie: <valid Taucho session>
```

```json
{
  "user_id": "user@example.com",
  "password": "<Unicorn password>"
}
```

`user_id` is the Unicorn login identifier (email or username), not the Taucho
user ID. The UI can prefill it with the signed-in user's email from
`window.__user.email`, but it must remain editable. Do not send a Taucho user ID
in the request body.

The Taucho account is derived from the signed session cookie. The API ignores
`X-User-ID` as an identity source; the portal proxy must forward a cookie the
API can validate. Do not put the password in a query string, log it, or retain
it after the request completes.

### Success — `200 OK`

```json
{
  "success": true,
  "brand_id": "unicorn",
  "status": "connected",
  "message": "Unicorn account connected"
}
```

The API authenticates with Unicorn, stores the returned token and stable
Unicorn account ID against the signed-in Taucho user, and does not store the
submitted password. Repeating the request reconnects the existing link rather
than creating a duplicate. Account creation is not part of this endpoint.

### Errors

Handler errors use JSON with `success: false` and a display-safe `message`.
If brand-credential services are unavailable, the API's standard `503` response
uses its general `error`/`reason` shape.

| Status | Meaning |
|---|---|
| `400 Bad Request` | Malformed JSON or missing `user_id` / `password` |
| `401 Unauthorized` | Missing or invalid Taucho session |
| `422 Unprocessable Entity` | Unicorn rejected the login; message does not reveal whether the account exists |
| `500 Internal Server Error` | Taucho could not save the connection |
| `503 Service Unavailable` | Unicorn login service unavailable or returned an incompatible response |

Example credential error:

```json
{
  "success": false,
  "message": "Unicorn ID or password was not accepted"
}
```

The legacy Unicorn `GET /auth/brand/unicorn/check-sso` and
`POST /auth/brand/unicorn/register-sso` endpoints return `410 Gone`; do not use
them for connection or registration.

## Frontend integration

- Replace the old `GET /auth/brand/unicorn/check-sso` and
  `POST /auth/brand/unicorn/register-sso` sequence with the single POST above.
- Show editable Unicorn login ID and password fields. Clear the password when
  the dialog closes or the request completes.
- Ensure the `/auth/brand/` proxy routes `connect-sso` and forwards the valid
  Taucho session cookie. A raw `X-User-ID` header is not sufficient.
- On success, show the connected state. On failure, display the response
  `message` without logging the submitted credentials.

The Unicorn-side `/auth/login` identifier contract is documented in
[UNICORN_PASSWORD_LOGIN_SERVER_API.md](UNICORN_PASSWORD_LOGIN_SERVER_API.md).

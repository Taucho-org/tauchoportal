# Unicorn Brand - Quick Reference

**Brand:** Unicorn Extermination Section  
**ID:** `unicorn`  
**Website:** https://unicornextermination.info  
**API:** https://api.unicornextermination.info  
**Device:** Penlight Waver  
**Status:** ✅ Ready for Use

---

## Files Changed

### New Files
- `internal/device/unicorn.go` - Device executor and command builder
- `docs/unicorn_products_insert.sql` - Database setup
- `docs/UNICORN_IMPLEMENTATION_COMPLETE.md` - Full documentation

### Modified Files
- `internal/device/credential_validator.go` - Added ValidateUnicorn method & interface update
- `internal/models/device.go` - Added "unicorn" to ValidBrands

---

## Key Differences from Govee

| Aspect | Govee | Unicorn |
|--------|-------|---------|
| Auth Type | API Key | Email/Password + JWT |
| Token Storage | APIKey | BearerToken |
| Credentials | 1 API key | Email + Password |
| Device Identifier | Device ID | Device ID (MAC format) |
| Control Types | Light only | Light + Motor |
| Commands | On/Off/Brightness/Color | Light/Motor/RGB/Wave |
| API Base | openapi.api.govee.com | api.unicornextermination.info |

---

## Quick Commands

### Test Credentials
```bash
curl -X POST http://localhost:8080/auth/brand/unicorn/test \
  -H "X-User-ID: 1" \
  -d '{"auth_type":"bearer_token","credentials":{"email":"user@example.com","password":"pass"}}'
```

### Connect Brand
```bash
curl -X POST http://localhost:8080/auth/brand/unicorn/connect \
  -H "X-User-ID: 1" \
  -d '{"auth_type":"bearer_token","credentials":{"email":"user@example.com","password":"pass"}}'
```

### Device Commands
```bash
# Light On
curl -X POST http://localhost:8080/devices/{deviceId}/commands \
  -d '{"action":"light_on"}'

# Wave
curl -X POST http://localhost:8080/devices/{deviceId}/commands \
  -d '{"action":"wave","params":{"color":"purple","brightness":200,"motor_speed":80,"duration_seconds":10}}'
```

---

## Supported Commands

- `light_on` - Turn light on
- `light_off` - Turn light off
- `motor_run` - Start motor
- `motor_stop` - Stop motor
- `rgb` - Set color (red/green/blue/white/yellow/cyan/purple)
- `wave` - Wave effect with color, brightness, speed, duration
- `wave_stop` - Stop wave

---

## Valid Color Values

- red
- green
- blue
- white
- yellow
- cyan
- purple

---

## Parameter Ranges

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| brightness | 0 | 255 | 200 |
| motor_speed | 1 | 100 | 100 |
| duration_seconds | 0 | 3600 | 0 (run until stopped) |

---

## Database Setup

Run once:
```bash
psql -U postgres -d taucho < docs/unicorn_products_insert.sql
```

This inserts:
- Brand "unicorn" with metadata
- Product "unicorn-penlightwaver"
- Credential field definitions

---

## Deployment Steps

1. ✅ Code implementation complete
2. Run SQL: `psql < docs/unicorn_products_insert.sql`
3. Build: `go build -v ./cmd`
4. Test endpoints (see Quick Commands above)
5. Deploy

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid email or password" | Wrong credentials | Verify Unicorn account |
| "Device not found" | Device doesn't exist | Check device ID format |
| "Invalid color" | Bad color value | Use one of 7 valid colors |
| "Token expired" | JWT older than 7 days | Re-authenticate |

---

## Testing Checklist

- [ ] Credential validation passes
- [ ] Device list retrieved
- [ ] Light commands work
- [ ] Motor commands work
- [ ] Color commands work
- [ ] Wave commands work
- [ ] Error handling correct

---

**Implementation Date:** September 9, 2026  
**Build Status:** ✅ Passes (go build ./cmd)  
**Ready for:** Database setup & testing

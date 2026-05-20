# Quick Start: API Authentication Setup

## What Was Changed

### Files Modified
- **cmd/main.go**: UI server now injects `X-API-Token` header when proxying to API
- **internal/config/config.go**: Added `APIToken` configuration field
- **internal/apiclient/client.go**: Updated to store and use API token

### Files Created
- **internal/middleware/auth.go**: Token validation and CORS middleware
- **AUTHENTICATION_SETUP.md**: Complete setup guide

## Quick Setup Commands

### Local Development (Right Now)

**Terminal 1 - API Server:**
```bash
$env:API_TOKEN = "dev-token-change-in-production"
$env:API_LISTEN_ADDR = ":8081"
# Then run your API server with the middleware applied
```

**Terminal 2 - UI Server:**
```bash
$env:API_TOKEN = "dev-token-change-in-production"
$env:API_URL = "http://localhost:8081"
$env:PORT = "8080"
go run ./cmd/main.go
```

## How It Works

```
Browser (http://localhost:8080)
    ↓
UI Server receives /api/* request
    ↓
UI Server adds header: X-API-Token: dev-token-change-in-production
    ↓
UI Server proxies to http://localhost:8081
    ↓
API Server validates X-API-Token header
    ↓
If token matches: Process request ✓
If token missing/invalid: Return 401 Unauthorized ✗
```

## Integration with Your API Server

In your API server code, wrap your handlers with the token middleware:

```go
import "github.com/yourusername/tauchoportal/internal/middleware"

func main() {
    apiToken := os.Getenv("API_TOKEN")
    if apiToken == "" {
        apiToken = "dev-token-change-in-production"
    }

    mux := http.NewServeMux()
    mux.HandleFunc("/auth/user", handleUserAuth)
    mux.HandleFunc("/streams", handleStreams)
    
    // Wrap all handlers with token authentication
    authMiddleware := middleware.APITokenAuthMiddleware(apiToken)
    handler := authMiddleware(mux)
    
    server := &http.Server{
        Addr:    ":8081",
        Handler: handler,
    }
    
    log.Fatal(server.ListenAndServe())
}
```

## For Production (www.taucho.org / api.taucho.org)

1. Generate secure token:
   ```powershell
   # Use this strong, random token in production
   [System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
   ```

2. Set environment variables in your deployment:
   ```
   API_TOKEN=<secure-random-token>
   API_URL=https://api.taucho.org
   ```

3. Configure CORS for your domain:
   ```go
   allowedOrigins := []string{"https://www.taucho.org"}
   corsMiddleware := middleware.CORSMiddleware(allowedOrigins)
   handler := corsMiddleware(authMiddleware(mux))
   ```

## Verify It Works

**Test API directly (should fail):**
```bash
curl http://localhost:8081/auth/user
# Output: {"error":"unauthorized"} (401)
```

**Test with token (should work):**
```bash
curl -H "X-API-Token: dev-token-change-in-production" http://localhost:8081/auth/user
# Output: User data (200)
```

**Test through UI proxy (should work):**
```bash
curl http://localhost:8080/api/auth/user
# Should work - UI adds token automatically
```

## Key Points

✅ **localhost** uses simple token for dev testing  
✅ **Production** uses secure environment variables  
✅ **No external dependencies** - uses only Go stdlib  
✅ **Secure** - constant-time comparison prevents timing attacks  
✅ **Works with existing sessions** - token is for service-to-service  

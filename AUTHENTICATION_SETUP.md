# API Authentication Setup Guide

This document explains how to set up service-to-service authentication between the UI server (localhost:8080 / www.taucho.org) and the API server (localhost:8081 / api.taucho.org).

## Overview

The system uses **API token authentication** with the `X-API-Token` header. The UI server includes this token when proxying requests to the API server.

## Local Development Setup (localhost)

### 1. Environment Variables

Create a `.env` file or set these variables:

```bash
# UI Server (port 8080)
PORT=8080
API_URL=http://localhost:8081
API_TOKEN=dev-token-change-in-production

# API Server (port 8081)
API_LISTEN_ADDR=:8081
API_TOKEN=dev-token-change-in-production
```

### 2. Start Both Servers

**Terminal 1 - API Server:**
```bash
export API_TOKEN=dev-token-change-in-production
export API_LISTEN_ADDR=:8081
go run ./cmd/api/main.go  # Adjust path to your API server
```

**Terminal 2 - UI Server:**
```bash
export API_TOKEN=dev-token-change-in-production
export API_URL=http://localhost:8081
export PORT=8080
go run ./cmd/main.go
```

### 3. How It Works

1. Browser requests reach UI server on `http://localhost:8080`
2. Browser makes requests to `/api/*` endpoints
3. UI server's reverse proxy intercepts `/api/*` requests
4. The proxy adds `X-API-Token: dev-token-change-in-production` header
5. Proxy forwards request to API server on `http://localhost:8081`
6. API server validates token via middleware
7. If valid, request is processed; if invalid, returns 401

## Production Setup

### 1. Environment Variables (Secure)

Use strong tokens in production. Generate secure tokens:

```bash
# Generate a secure token (Linux/Mac)
openssl rand -base64 32

# Generate a secure token (PowerShell Windows)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -SetSeed 0 -Count 32 | ForEach-Object {[char]$_}) -join ''))
```

**UI Server (www.taucho.org):**
```bash
API_TOKEN=<your-secure-token>
API_URL=https://api.taucho.org
PORT=3000  # or your container port
```

**API Server (api.taucho.org):**
```bash
API_TOKEN=<your-secure-token>
API_LISTEN_ADDR=:3000  # or your container port
```

### 2. Docker/Container Setup

**docker-compose.yml example:**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8081:3000"
    environment:
      API_LISTEN_ADDR: ":3000"
      API_TOKEN: ${API_TOKEN}
    networks:
      - taucho

  ui:
    build:
      context: .
      dockerfile: Dockerfile.ui
    ports:
      - "8080:3000"
    environment:
      API_URL: http://api:3000  # Internal network URL
      API_TOKEN: ${API_TOKEN}
      PORT: 3000
    depends_on:
      - api
    networks:
      - taucho

networks:
  taucho:
```

### 3. CORS Configuration (Production)

In your API server, configure allowed origins:

```go
// In your API server main.go
allowedOrigins := []string{
    "https://www.taucho.org",
}
apiCorsMiddleware := middleware.CORSMiddleware(allowedOrigins)
mux.Handle("/", apiCorsMiddleware(yourRouter))
```

## API Server Integration

### Add Token Validation to Your API Server

In your API server's `main.go`:

```go
package main

import (
    "net/http"
    "os"
    "log"
    "github.com/yourusername/tauchoportal/internal/middleware"
)

func main() {
    apiToken := os.Getenv("API_TOKEN")
    if apiToken == "" {
        apiToken = "dev-token-change-in-production"
    }

    mux := http.NewServeMux()

    // Apply token auth middleware to all endpoints
    authMiddleware := middleware.APITokenAuthMiddleware(apiToken)
    
    // Example route with authentication
    mux.HandleFunc("/auth/user", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"id":1,"email":"user@example.com"}`))
    })

    handler := authMiddleware(mux)

    server := &http.Server{
        Addr:    os.Getenv("API_LISTEN_ADDR"),
        Handler: handler,
    }

    log.Printf("API server starting on %s", server.Addr)
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("server error: %v", err)
    }
}
```

### Selective Route Protection

If you want to protect only specific routes:

```go
mux := http.NewServeMux()
authMiddleware := middleware.APITokenAuthMiddleware(apiToken)

// Protected routes
protectedMux := http.NewServeMux()
protectedMux.HandleFunc("/auth/user", handleUserProfile)
protectedMux.HandleFunc("/streams", handleStreams)
mux.Handle("/", authMiddleware(protectedMux))

// Public routes (optional)
mux.HandleFunc("/health", handleHealth)
mux.HandleFunc("/oauth/login", handleOAuthLogin)
```

## Testing

### Local Testing with cURL

```bash
# Without token (should fail with 401)
curl http://localhost:8081/auth/user

# With token (should succeed)
curl -H "X-API-Token: dev-token-change-in-production" http://localhost:8081/auth/user
```

### Through UI Proxy

```bash
# This should work (UI adds token automatically)
curl http://localhost:8080/api/auth/user
```

## Security Considerations

1. **Never hardcode tokens** - Use environment variables
2. **Rotate tokens** - Update production tokens regularly
3. **Use HTTPS in production** - Always use SSL/TLS for production
4. **Token length** - Use tokens at least 32 bytes (256 bits)
5. **Timing attacks** - The middleware uses constant-time comparison
6. **CORS headers** - Restrict to specific origins in production
7. **Monitor logs** - Log all 401 failures for security audit

## Troubleshooting

### Getting 401 Errors

1. Check that `API_TOKEN` environment variable is set on both servers
2. Verify tokens match exactly (case-sensitive)
3. Check API server logs: `grep "Unauthorized" logs`
4. Ensure middleware is applied to all protected routes

### Cross-Origin Issues

1. Check browser console for CORS errors
2. Verify `Access-Control-Allow-Origin` header is returned
3. Check that origin matches `allowedOrigins` in CORS middleware
4. For local development, you can use `*` for allowed origins

### Connection Refused

1. Verify API server is running on correct port
2. Check firewall settings
3. Verify `API_URL` is correct in UI server
4. Check network connectivity between servers

## Migration Path

If you currently use cookie-based sessions:

1. Keep existing session auth for user authentication
2. Add API token for service-to-service communication
3. In your handlers, check both:
   - `X-API-Token` header (for UI->API calls)
   - Session cookies (for user session validation)

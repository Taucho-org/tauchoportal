# Website Development & Debugging Guide

## Quick Start

### 1. Run the Website Server
Simply press **F5** in VS Code to start debugging the website!

The debugger will:
- Start the website server on `http://localhost:8080`
- Show console output in the Debug Console
- Allow you to set breakpoints in Go code

### 2. View the Pages

- **Home Page**: http://localhost:8080/
- **About Page**: http://localhost:8080/about
- **Health Check**: http://localhost:8080/health (JSON endpoint)
- **API Version**: http://localhost:8080/api/version (JSON endpoint)

## File Structure

```
website/
├── cmd/
│   └── main.go          # Server entry point
├── public/
│   ├── index.html       # Home page
│   └── about.html       # About page
└── README.md            # This file
```

## Editing Pages

1. Edit HTML files in `website/public/`
2. Save the file
3. **Refresh your browser** (F5 or Ctrl+R) - no server restart needed!

## Debugging Tips

### Setting Breakpoints
- Click in the gutter (left margin) next to line numbers in `main.go` to set breakpoints
- When a request hits your breakpoint, the debugger will pause
- Inspect variables in the Debug sidebar

### Variables & Watch
- Hover over variables to see their values
- Use the "Watch" panel to monitor specific expressions

### Debug Console
- View server logs in the Debug Console
- Click URLs in logs to open them in the browser

### Common Endpoints to Debug
```bash
# Health check
curl http://localhost:8080/health

# API version
curl http://localhost:8080/api/version

# Visit home page
open http://localhost:8080
```

## Making Changes

### Adding a New Page
1. Create `website/public/newpage.html` with your HTML
2. Link it from existing pages (e.g., `<a href="/newpage">`)
3. Refresh browser

### Adding a New Go Endpoint
1. Edit `website/cmd/main.go`
2. Add a handler:
```go
mux.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"message":"hello"}`))
})
```
3. Save and the debugger will show you need to restart
4. Press **Ctrl+C** in Debug Console, then **F5** to restart

## Stopping the Debugger

Press **Ctrl+C** in the Debug Console or click the Stop button (red square) in the Debug toolbar.

## Multiple Configurations

In VS Code, you can also run:
- **Debug API** - Debug the Cloud Function API
- **Debug All** - Run both website and API together

Select the configuration from the Debug dropdown before pressing F5.

## Port Configuration

The website runs on port `8080` by default. To change:
1. Edit `.vscode/launch.json`
2. Change the `PORT` environment variable
3. Restart debugging with F5

Happy debugging! 🚀

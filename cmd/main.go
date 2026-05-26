package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8081"
	}

	// Get the API token for service-to-service authentication
	apiToken := os.Getenv("API_TOKEN")
	if apiToken == "" {
		apiToken = "dev-token-change-in-production"
	}

	target, err := url.Parse(apiURL)
	if err != nil {
		log.Fatalf("invalid API_URL %q: %v", apiURL, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Create a custom director that strips /api prefix AND adds the auth token
	proxy.Director = func(r *http.Request) {
		// Strip the /api prefix from the path
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
		if r.URL.RawPath != "" {
			r.URL.RawPath = strings.TrimPrefix(r.URL.RawPath, "/api")
		}
		
		// Set the target scheme and host
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		
		// Update the Host header to match the target
		r.Host = target.Host
		r.RequestURI = "" // Clear RequestURI as it's only valid for client requests
		
		// Add the API token for service-to-service authentication
		r.Header.Set("X-API-Token", apiToken)
		
		// Log for debugging
		log.Printf("Proxying request: %s %s -> %s://%s%s", r.Method, r.RequestURI, r.URL.Scheme, r.URL.Host, r.URL.Path)
	}

	router := NewRouter()
	mux := http.NewServeMux()

	// Proxy /api/* to the API server
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// Static files with clean URLs (no .html extension)
	mux.HandleFunc("/", router.ServeStatic)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		server.Shutdown(shutdownCtx)
	}()

	log.Printf("UI server starting on :%s (proxying API to %s)", port, apiURL)
	log.Printf("Open http://localhost:%s in your browser", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

// Router handles clean URLs by serving HTML files without extension
type Router struct {
	publicDir string
}

// NewRouter creates a new router
func NewRouter() *Router {
	return &Router{
		publicDir: "public",
	}
}

// ServeStatic serves static files with clean URLs
func (r *Router) ServeStatic(w http.ResponseWriter, req *http.Request) {
	path := req.URL.Path

	// Normalize path
	if path == "/" {
		path = "/index.html"
	} else if strings.HasPrefix(path, "/monitors/") {
		// SPA prefix routing: all /monitors/* sub-paths are handled by monitors.html
		path = "/monitors.html"
	} else if !strings.Contains(path, ".") {
		// If no file extension, try with .html
		path = path + ".html"
	}

	// Clean the path to prevent directory traversal
	path = filepath.Clean(path)
	filePath := filepath.Join(r.publicDir, path)

	// Serve the file
	http.ServeFile(w, req, filePath)
}

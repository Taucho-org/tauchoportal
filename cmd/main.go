package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"tauchoportal/internal/apiclient"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Initialize API client (stateless - no database needed)
	apiClient := apiclient.NewClient()

	// Custom router with clean URLs
	router := NewRouter()

	mux := http.NewServeMux()

	// Static files with clean URLs (no .html extension)
	mux.HandleFunc("/", router.ServeStatic)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// API version endpoint
	mux.HandleFunc("/api/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"version":"1.0.0","service":"tauchoportal-ui"}`))
	})

	// OAuth API proxy endpoints - these call the backend API and return auth URLs
	mux.HandleFunc("/api/oauth/login", handleOAuthStart(apiClient))
	mux.HandleFunc("/api/auth/check", handleAuthCheck(apiClient))
	mux.HandleFunc("/api/auth/user", handleGetUserProfile(apiClient))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	// Graceful shutdown
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		server.Shutdown(shutdownCtx)
	}()

	log.Printf("Tauchoportal UI server starting on :%s", port)
	log.Printf("Open http://localhost:%s in your browser", port)
	log.Printf("API URL: %s", apiClient.GetBaseURL())
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

// handleOAuthStart returns the OAuth login URL from the backend API
func handleOAuthStart(apiClient *apiclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		provider := r.URL.Query().Get("provider")
		if provider == "" {
			provider = "google"
		}

		// Call the backend API to get the OAuth login URL
		result, err := apiClient.GetOAuthLoginURL(provider)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

// handleAuthCheck checks if the user is authenticated
func handleAuthCheck(apiClient *apiclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		isAuth, err := apiClient.IsAuthenticated(r)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"authenticated": false, "error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"authenticated": isAuth})
	}
}

// handleGetUserProfile retrieves the authenticated user's profile
func handleGetUserProfile(apiClient *apiclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		user, err := apiClient.GetUserProfile(r)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(user)
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
	} else if !strings.Contains(path, ".") {
		// If no file extension, try with .html
		path = path + ".html"
	}

	// Clean the path to prevent directory traversal
	path = strings.ReplaceAll(path, "..", "")
	filePath := path
	if !strings.HasPrefix(filePath, "/") {
		filePath = "/" + filePath
	}
	filePath = "public" + filePath

	// Serve the file
	http.ServeFile(w, req, filePath)
}

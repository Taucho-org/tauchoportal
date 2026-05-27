package main

import (
	"context"
	"fmt"
	"io"
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

	"google.golang.org/api/idtoken"
	"golang.org/x/oauth2"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8081"
	}

	target, err := url.Parse(apiURL)
	if err != nil {
		log.Fatalf("invalid API_URL %q: %v", apiURL, err)
	}

	// Try to create a Google identity token source for service-to-service auth.
	// This works on Cloud Run (uses the metadata server automatically).
	// Falls back to nil on local dev — no auth header is added then.
	var tokenSource oauth2.TokenSource
	ts, err := idtoken.NewTokenSource(ctx, apiURL)
	if err != nil {
		log.Printf("Identity token source unavailable (local dev?): %v", err)
	} else {
		tokenSource = ts
		log.Printf("Identity token source initialized for audience: %s", apiURL)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Director = func(r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
		if r.URL.RawPath != "" {
			r.URL.RawPath = strings.TrimPrefix(r.URL.RawPath, "/api")
		}
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		r.Host = target.Host
		r.RequestURI = ""

		// Attach Google identity token for Cloud Run IAM auth
		if tokenSource != nil {
			if tok, err := tokenSource.Token(); err != nil {
				log.Printf("Warning: failed to get identity token: %v", err)
			} else {
				r.Header.Set("Authorization", "Bearer "+tok.AccessToken)
			}
		}

		log.Printf("Proxying: %s %s -> %s://%s%s", r.Method, r.RequestURI, r.URL.Scheme, r.URL.Host, r.URL.Path)
	}

	router := NewRouter()
	mux := http.NewServeMux()

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// Debug endpoint: tests API connectivity and shows config
	mux.HandleFunc("/debug/api", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, "<h2>API Debug</h2>")
		fmt.Fprintf(w, "<p><b>Resolved API URL:</b> %s</p>", htmlEscape(apiURL))
		fmt.Fprintf(w, "<p><b>Identity token source:</b> %v</p>", tokenSource != nil)

		var authHeader string
		if tokenSource != nil {
			if tok, err := tokenSource.Token(); err != nil {
				fmt.Fprintf(w, "<p>❌ <b>Token fetch error:</b> %v</p>", err)
			} else {
				authHeader = "Bearer " + tok.AccessToken
				fmt.Fprintf(w, "<p>✅ <b>Identity token obtained</b> (expires: %s)</p>", tok.Expiry.Format(time.RFC3339))
			}
		}

		endpoints := []string{"/auth/user", "/oauth/login?provider=google"}
		client := &http.Client{Timeout: 5 * time.Second}
		for _, ep := range endpoints {
			req, err := http.NewRequest("GET", apiURL+ep, nil)
			if err != nil {
				fmt.Fprintf(w, "<p>❌ <b>%s</b>: failed to build request: %v</p>", htmlEscape(ep), err)
				continue
			}
			if authHeader != "" {
				req.Header.Set("Authorization", authHeader)
			}
			req.Header.Set("Cookie", r.Header.Get("Cookie"))
			resp, err := client.Do(req)
			if err != nil {
				fmt.Fprintf(w, "<p>❌ <b>%s</b>: connection error: %v</p>", htmlEscape(ep), err)
				continue
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			resp.Body.Close()
			fmt.Fprintf(w, "<p>%s <b>%s</b>: HTTP %d — <code>%s</code></p>",
				statusEmoji(resp.StatusCode), htmlEscape(ep), resp.StatusCode, htmlEscape(string(body)))
		}
	})

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
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

type Router struct {
	publicDir string
}

func NewRouter() *Router {
	return &Router{publicDir: "public"}
}

func (r *Router) ServeStatic(w http.ResponseWriter, req *http.Request) {
	path := req.URL.Path
	if path == "/" {
		path = "/index.html"
	} else if strings.HasPrefix(path, "/monitors/") {
		path = "/monitors.html"
	} else if !strings.Contains(path, ".") {
		path = path + ".html"
	}
	path = filepath.Clean(path)
	http.ServeFile(w, req, filepath.Join(r.publicDir, path))
}

func statusEmoji(code int) string {
	if code >= 200 && code < 300 {
		return "✅"
	}
	return "❌"
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&#34;")
	return s
}

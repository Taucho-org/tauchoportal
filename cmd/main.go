package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
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

	"golang.org/x/oauth2"
	"google.golang.org/api/idtoken"
)

type PageData struct {
	Title string
	User  *UserProfile
	Page  string
}

type UserProfile struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Picture  string `json:"picture"`
}

type pageConfig struct {
	Name        string
	Title       string
	RequireAuth bool
}

var pageRoutes = map[string]pageConfig{
	"/":           {Name: "index", Title: "Home", RequireAuth: false},
	"/login":      {Name: "login", Title: "Login", RequireAuth: false},
	"/register":   {Name: "register", Title: "Register", RequireAuth: false},
	"/dashboard":  {Name: "dashboard", Title: "Dashboard", RequireAuth: true},
	"/monitors":   {Name: "monitors", Title: "Watched Channels", RequireAuth: true},
	"/devices":    {Name: "devices", Title: "My Devices", RequireAuth: true},
	"/streams":    {Name: "streams", Title: "My Streams", RequireAuth: true},
	"/conditions": {Name: "conditions", Title: "Conditions", RequireAuth: true},
	"/triggers":   {Name: "triggers", Title: "Triggers", RequireAuth: true},
	"/about":      {Name: "about", Title: "About", RequireAuth: false},
}

type Server struct {
	apiURL      string
	apiAudience string
	tokenSource oauth2.TokenSource
	templates   map[string]*template.Template
	publicDir   string
}

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

	apiAudience := os.Getenv("API_AUDIENCE")
	if apiAudience == "" {
		apiAudience = apiURL
	}

	var tokenSource oauth2.TokenSource
	ts, err := idtoken.NewTokenSource(ctx, apiAudience)
	if err != nil {
		log.Printf("Identity token source unavailable (local dev?): %v", err)
	} else {
		tokenSource = ts
		log.Printf("Identity token source initialized for audience: %s", apiAudience)
	}

	server := &Server{
		apiURL:      apiURL,
		apiAudience: apiAudience,
		tokenSource: tokenSource,
		templates:   loadTemplates(),
		publicDir:   "public",
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
		attachIdentityToken(r, tokenSource)
		log.Printf("Proxying: %s -> %s://%s%s", r.Method, r.URL.Scheme, r.URL.Host, r.URL.Path)
	}

	// callbackProxy forwards /auth/callback/* to the API unchanged (no prefix stripping).
	// Google redirects the user's browser to the portal after OAuth; we relay it to the API.
	callbackProxy := httputil.NewSingleHostReverseProxy(target)
	callbackProxy.Director = func(r *http.Request) {
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		r.Host = target.Host
		r.RequestURI = ""
		attachIdentityToken(r, tokenSource)
		log.Printf("OAuth callback: %s -> %s://%s%s", r.Method, r.URL.Scheme, r.URL.Host, r.URL.Path)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/auth/callback/", func(w http.ResponseWriter, r *http.Request) {
		callbackProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	})
	mux.HandleFunc("/debug/api", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, "<h2>API Debug</h2>")
		fmt.Fprintf(w, "<p><b>API URL:</b> %s</p>", htmlEscape(apiURL))
		fmt.Fprintf(w, "<p><b>Token audience:</b> %s</p>", htmlEscape(apiAudience))
		fmt.Fprintf(w, "<p><b>Identity token source:</b> %v</p>", tokenSource != nil)

		cookie := r.Header.Get("Cookie")
		if cookie != "" {
			fmt.Fprintf(w, "<p>✅ <b>Session cookie present</b> in browser request (%d bytes)</p>", len(cookie))
		} else {
			fmt.Fprintf(w, "<p>⚠️ <b>No cookie</b> in browser request — you may not be logged in</p>")
		}

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
			req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, apiURL+ep, nil)
			if err != nil {
				fmt.Fprintf(w, "<p>❌ <b>%s</b>: failed to build request: %v</p>", htmlEscape(ep), err)
				continue
			}
			if authHeader != "" {
				req.Header.Set("Authorization", authHeader)
			}
			req.Header.Set("Cookie", cookie)
			resp, err := client.Do(req)
			if err != nil {
				fmt.Fprintf(w, "<p>❌ <b>%s</b>: connection error: %v</p>", htmlEscape(ep), err)
				continue
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			resp.Body.Close()
			emoji := "✅"
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				emoji = "❌"
			}
			fmt.Fprintf(w, "<p>%s <b>%s</b>: HTTP %d — <code>%s</code></p>",
				emoji, htmlEscape(ep), resp.StatusCode, htmlEscape(string(body)))
		}
	})
	mux.Handle("/", server)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	httpServer := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()

	log.Printf("UI server starting on :%s (proxying API to %s)", port, apiURL)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func loadTemplates() map[string]*template.Template {
	result := make(map[string]*template.Template)
	pages, err := filepath.Glob(filepath.Join("pages", "*.gohtml"))
	if err != nil {
		log.Fatalf("failed to list templates: %v", err)
	}
	if len(pages) == 0 {
		log.Fatal("no page templates found")
	}

	basePath := filepath.Join("templates", "layouts", "base.gohtml")
	headerPath := filepath.Join("templates", "partials", "header.gohtml")
	funcMap := template.FuncMap{
		"userJSON": userJSON,
	}

	for _, pagePath := range pages {
		name := strings.TrimSuffix(filepath.Base(pagePath), filepath.Ext(pagePath))
		tmpl, err := template.New(name).Funcs(funcMap).ParseFiles(basePath, headerPath, pagePath)
		if err != nil {
			log.Fatalf("failed to parse template %s: %v", pagePath, err)
		}
		result[name] = tmpl
	}

	return result
}

func userJSON(user *UserProfile) template.JS {
	payload, err := json.Marshal(user)
	if err != nil {
		return template.JS("null")
	}
	return template.JS(string(payload))
}

func attachIdentityToken(r *http.Request, tokenSource oauth2.TokenSource) {
	if tokenSource == nil {
		return
	}
	if tok, err := tokenSource.Token(); err != nil {
		log.Printf("Warning: failed to get identity token: %v", err)
	} else {
		r.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if filepath.Ext(r.URL.Path) != "" {
		s.servePublicFile(w, r)
		return
	}

	cfg, ok := pageRoutes[r.URL.Path]
	if !ok {
		if strings.HasPrefix(r.URL.Path, "/monitors/") {
			cfg = pageRoutes["/monitors"]
		} else {
			http.NotFound(w, r)
			return
		}
	}

	user := s.fetchUser(r)
	if user != nil && (cfg.Name == "index" || cfg.Name == "login" || cfg.Name == "register") {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}
	if cfg.RequireAuth && user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	tmpl, ok := s.templates[cfg.Name]
	if !ok {
		http.Error(w, "template not found", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	data := PageData{Title: cfg.Title, User: user, Page: cfg.Name}
	if err := tmpl.ExecuteTemplate(w, "page", data); err != nil {
		log.Printf("failed to render page %s: %v", cfg.Name, err)
		http.Error(w, "failed to render page", http.StatusInternalServerError)
	}
}

func (s *Server) servePublicFile(w http.ResponseWriter, r *http.Request) {
	relPath := filepath.Clean(filepath.FromSlash(strings.TrimPrefix(r.URL.Path, "/")))
	if relPath == "." || strings.HasPrefix(relPath, "..") {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join(s.publicDir, relPath))
}

func (s *Server) fetchUser(r *http.Request) *UserProfile {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, s.apiURL+"/auth/user", nil)
	if err != nil {
		log.Printf("fetchUser: failed to build request: %v", err)
		return nil
	}
	cookie := r.Header.Get("Cookie")
	req.Header.Set("Cookie", cookie)
	attachIdentityToken(req, s.tokenSource)

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("fetchUser: API call failed (url=%s, cookie_present=%v): %v", s.apiURL+"/auth/user", cookie != "", err)
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	if resp.StatusCode != http.StatusOK {
		log.Printf("fetchUser: API returned %d (cookie_present=%v): %s", resp.StatusCode, cookie != "", string(body))
		return nil
	}

	var user UserProfile
	if err := json.Unmarshal(body, &user); err != nil {
		log.Printf("fetchUser: failed to decode user JSON: %v — body: %s", err, string(body))
		return nil
	}
	return &user
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&#34;")
	return s
}

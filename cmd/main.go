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
	"reflect"
	"strconv"
	"strings"
	"syscall"
	"time"

	"tauchoportal/internal/controller"
	"tauchoportal/internal/i18n"
	"tauchoportal/internal/icons"

	"golang.org/x/oauth2"
	"google.golang.org/api/idtoken"
)

type PageData struct {
	TitleKey                string
	User                    *UserProfile
	Page                    string
	Lang                    string
	I18n                    *i18n.Translator
	API                     *controller.API
	CurrentChannel          *controller.ChannelForTemplate
	Condition               *controller.ConditionForTemplate
	Conditions              []controller.ConditionForTemplate
	EventTypes              []string
	ChannelDetail           *controller.ChannelDetailForTemplate
	ChannelDetailConditions []controller.ConditionDetailForTemplate
	Devices                 []controller.DeviceForTemplate
	Channels                *controller.ChannelsPageData
	Dashboard               *controller.DashboardPageData
	MyBrands                []controller.MyConnectedBrand
	Brands                  []controller.CatalogBrand
	PlatformMeta            map[string]map[string]interface{}
	EventBadgeClass         map[string]string
	EventFieldOptions       []controller.EventFieldOption
	ConditionTemplates      []controller.ConditionTemplate
	ConditionProperties     []controller.EventSchemaField
}

type UserProfile struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Picture  string `json:"picture"`
}

type pageConfig struct {
	Name        string
	TitleKey    string
	RequireAuth bool
}

var pageRoutes = map[string]pageConfig{
	"/":                 {Name: "index", TitleKey: "index.title", RequireAuth: false},
	"/login":            {Name: "login", TitleKey: "login.title", RequireAuth: false},
	"/register":         {Name: "register", TitleKey: "register.title", RequireAuth: false},
	"/dashboard":        {Name: "dashboard", TitleKey: "dashboard.title", RequireAuth: true},
	"/channels":         {Name: "channels", TitleKey: "channels.title", RequireAuth: true},
	"/channel":          {Name: "channel", TitleKey: "channel.title", RequireAuth: true},
	"/conditions":       {Name: "conditions", TitleKey: "conditions.title", RequireAuth: true},
	"/condition":        {Name: "condition", TitleKey: "condition.title", RequireAuth: true},
	"/devices":          {Name: "devices", TitleKey: "devices.title", RequireAuth: true},
	"/brand-settings":   {Name: "brand-settings", TitleKey: "brand-settings.title", RequireAuth: true},
	"/about":            {Name: "about", TitleKey: "about.title", RequireAuth: false},
	"/login-settings":   {Name: "login-settings", TitleKey: "login-settings.title", RequireAuth: true},
	"/account-settings": {Name: "account-settings", TitleKey: "account-settings.title", RequireAuth: true},
	"/privacy-policy":   {Name: "privacy-policy", TitleKey: "privacy-policy.title", RequireAuth: false},
	"/terms-of-service": {Name: "terms-of-service", TitleKey: "terms-of-service.title", RequireAuth: false},
	"/data-deletion":    {Name: "data-deletion", TitleKey: "data-deletion.title", RequireAuth: false},
}

type Server struct {
	apiURL      string
	apiAudience string
	tokenSource oauth2.TokenSource
	templates   map[string]*template.Template
	publicDir   string
	i18n        *i18n.Bundle
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
		i18n:        i18n.Load(),
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
		// Inject X-User-ID so the API can resolve user ownership without
		// re-parsing the session cookie on every resource request.
		// The portal is the trusted proxy: it validates the cookie via
		// fetchUser before injecting this header. The API should trust
		// X-User-ID only from requests that also carry a valid identity token
		// (Authorization: Bearer ...) or when running in a trusted network.
		if user := server.fetchUser(r); user != nil {
			r.Header.Set("X-User-ID", strconv.Itoa(user.ID))
		}
	}

	// callbackProxy forwards /auth/callback/* to the API unchanged (no prefix stripping).
	// Google redirects the user's browser to the portal after OAuth; we relay it to the API.
	// ModifyResponse: if the portal set an "oauth_return" cookie before the OAuth redirect
	// (via /set-oauth-return), use that URL as the post-OAuth redirect destination.
	callbackProxy := httputil.NewSingleHostReverseProxy(target)

	callbackProxy.Director = func(r *http.Request) {
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		r.Host = target.Host
		r.RequestURI = ""
		attachIdentityToken(r, tokenSource)
	}
	callbackProxy.ModifyResponse = func(resp *http.Response) error {
		// If oauth_return cookie is set, use it as redirect destination
		// (OAuth callback endpoint sets /auth/session-ready by default)
		if resp.StatusCode >= 300 && resp.StatusCode < 400 {
			if cookie, err := resp.Request.Cookie("oauth_return"); err == nil && cookie.Value != "" {
				returnURL := cookie.Value
				if strings.HasPrefix(returnURL, "/") {
					resp.Header.Set("Location", returnURL)
					resp.Header.Add("Set-Cookie", "oauth_return=; Path=/; Max-Age=0; SameSite=Lax")
				}
			}
		}
		return nil
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/auth/callback/", func(w http.ResponseWriter, r *http.Request) {
		callbackProxy.ServeHTTP(w, r)
	})
	// /set-oauth-return: stores the post-OAuth redirect URL in a short-lived cookie.
	// Called by the account-settings page before initiating an OAuth connect flow so
	// the callbackProxy can redirect back to account-settings after the callback.
	mux.HandleFunc("/set-oauth-return", func(w http.ResponseWriter, r *http.Request) {
		returnURL := r.URL.Query().Get("url")
		if returnURL == "" || !strings.HasPrefix(returnURL, "/") {
			http.Error(w, "invalid url", http.StatusBadRequest)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "oauth_return",
			Value:    "/auth/session-ready?redirect=" + returnURL,
			Path:     "/",
			MaxAge:   600,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/set-lang", func(w http.ResponseWriter, r *http.Request) {
		lang := r.URL.Query().Get("lang")
		for _, s := range i18n.Supported() {
			if lang == s {
				http.SetCookie(w, &http.Cookie{
					Name:     i18n.CookieName,
					Value:    lang,
					Path:     "/",
					MaxAge:   365 * 24 * 3600,
					SameSite: http.SameSiteLaxMode,
				})
				break
			}
		}
		back := r.URL.Query().Get("back")
		if back == "" || !strings.HasPrefix(back, "/") {
			back = "/"
		}
		http.Redirect(w, r, back, http.StatusSeeOther)
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
	mux.HandleFunc("/auth/session-ready", func(w http.ResponseWriter, r *http.Request) {
		// This endpoint validates the session cookie was stored
		user := server.fetchUser(r)
		if user != nil {
			// Cookie stored successfully, redirect to dashboard
			http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
			return
		}

		// Cookie not yet stored, show intermediate page with retry logic
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `
		<html>
		<head><meta http-equiv='refresh' content='0; url=/dashboard'><title>Logging in...</title></head>
		<body>Loading..</body>
		</html>
		`)
	})
	// SSO check and register endpoints - handles auth internally and proxies to API with X-User-ID header
	mux.HandleFunc("/auth/brand/", func(w http.ResponseWriter, r *http.Request) {
		// Extract path: /auth/brand/{brandId}/{action}
		path := strings.TrimPrefix(r.URL.Path, "/auth/brand/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		brandID := parts[0]
		action := parts[1]

		// Only handle SSO check and register
		if (action != "check-sso" && action != "register-sso") || r.Method == "GET" && action == "register-sso" {
			// Not an SSO endpoint, pass to API proxy
			proxy.ServeHTTP(w, r)
			return
		}

		// Get current user from session
		user := server.fetchUser(r)
		if user == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Build the API request
		apiEndpoint := fmt.Sprintf("%s/auth/brand/%s/%s", apiURL, url.QueryEscape(brandID), action)
		req, err := http.NewRequestWithContext(r.Context(), r.Method, apiEndpoint, r.Body)
		if err != nil {
			http.Error(w, "failed to create request", http.StatusInternalServerError)
			return
		}

		// Copy headers (except Host and Content-Length)
		for header, values := range r.Header {
			if header != "Host" && header != "Content-Length" {
				for _, value := range values {
					req.Header.Add(header, value)
				}
			}
		}

		// Add X-User-ID header with current user's ID
		req.Header.Set("X-User-ID", strconv.Itoa(user.ID))

		// Add identity token if available
		attachIdentityToken(req, tokenSource)

		// Execute the request
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, fmt.Sprintf("API request failed: %v", err), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Copy response headers
		for header, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(header, value)
			}
		}

		// Write response status and body
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
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

var globalTemplates map[string]*template.Template

func loadTemplates() map[string]*template.Template {
	result := make(map[string]*template.Template)
	pages, err := filepath.Glob(filepath.Join("templates", "pages", "*.html"))
	if err != nil {
		log.Fatalf("failed to list templates: %v", err)
	}
	if len(pages) == 0 {
		log.Fatal("no page templates found")
	}

	baseLayoutPath := filepath.Join("templates", "layouts", "base.html")
	channelLayoutPath := filepath.Join("templates", "layouts", "channels.html")
	deviceLayoutPath := filepath.Join("templates", "layouts", "devices.html")
	headerPath := filepath.Join("templates", "partials", "header.html")
	nologinheaderPath := filepath.Join("templates", "partials", "nologinheader.html")
	loginPath := filepath.Join("templates", "partials", "login.html")
	catalogDir := filepath.Join("templates", "partials", "catalogs")

	// Load all catalog files dynamically
	catalogFiles := []string{}
	catalogEntries, err := os.ReadDir(catalogDir)
	if err == nil {
		for _, entry := range catalogEntries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".html") {
				catalogFiles = append(catalogFiles, filepath.Join(catalogDir, entry.Name()))
			}
		}
	}

	funcMap := template.FuncMap{
		"userJSON": userJSON,
		"toJSON":   toJSON,
		"jsonMarshal": func(v interface{}) template.JS {
			return toJSON(v)
		},
		"i18nJSON": func(t *i18n.Translator) template.JS {
			if t == nil {
				return template.JS("{}")
			}
			return t.JS()
		},
		"i18nJSONByPrefix": func(t *i18n.Translator, prefixes ...string) template.JS {
			if t == nil {
				return template.JS("{}")
			}
			return t.JSByPrefix(prefixes)
		},
		"platformIcon":      icons.Get,
		"platformIconsJSON": icons.AllJSON,
		"dict":              dict,
		"dictparams":        dictparams,
		"field":             field,
		"escHtml":           escapeHTML,
		"formatCount":       formatChannelCount,
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
		"multiply": func(a, b int) int {
			return a * b
		},
		"urlEscape": func(s string) string {
			return url.QueryEscape(s)
		},
		"capitalize":     capitalize,
		"formatTimeAgo":  formatTimeAgo,
		"getEventLabel":  controller.GetEventLabel,
		"formatDateTime": controller.FormatDateTime,
		"replace": func(s, old, new string) string {
			return strings.ReplaceAll(s, old, new)
		},
		"tostring": func(v interface{}) string {
			return fmt.Sprintf("%v", v)
		},
		"renderCatalog": func(brandID string, i18nTrans *i18n.Translator, data interface{}) (template.HTML, error) {
			if globalTemplates == nil {
				return "", fmt.Errorf("templates not loaded")
			}
			tmpl := globalTemplates["devices"]
			if tmpl == nil {
				return "", fmt.Errorf("devices template not found")
			}
			tplName := fmt.Sprintf("catalog-%s", brandID)

			// Wrap data to include i18n translator
			type catalogData struct {
				I18n interface{}
				Data interface{}
			}

			buf := &strings.Builder{}
			err := tmpl.ExecuteTemplate(buf, tplName, catalogData{I18n: i18nTrans, Data: data})
			if err != nil {
				return "", err
			}
			return template.HTML(buf.String()), nil
		},
	}

	for _, pagePath := range pages {
		name := strings.TrimSuffix(filepath.Base(pagePath), filepath.Ext(pagePath))
		// Combine all file paths for parsing
		// Only include the appropriate layout based on the page type to avoid template conflicts
		filePaths := []string{baseLayoutPath, headerPath, nologinheaderPath, loginPath, pagePath}

		// Add the appropriate layout file based on page name
		switch name {
		case "channel", "channels", "conditions", "condition":
			filePaths = append([]string{channelLayoutPath}, filePaths...)
		case "devices", "brand-settings":
			filePaths = append([]string{deviceLayoutPath}, filePaths...)
		}

		filePaths = append(filePaths, catalogFiles...)

		tmpl, err := template.New(name).Funcs(funcMap).ParseFiles(filePaths...)
		if err != nil {
			log.Fatalf("failed to parse template %s: %v", pagePath, err)
		}
		result[name] = tmpl
	}

	globalTemplates = result
	return result
}

func toJSON(v interface{}) template.JS {
	payload, err := json.Marshal(v)
	if err != nil {
		return template.JS("null")
	}
	return template.JS(string(payload))
}

func userJSON(user *UserProfile) template.JS {
	return toJSON(user)
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
		if strings.HasPrefix(r.URL.Path, "/channels/") {
			// Route to appropriate channel sub-page based on URL pattern
			parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
			if len(parts) >= 2 && parts[0] == "channels" {
				if len(parts) == 2 {
					// /channels/{channel_id}
					cfg = pageRoutes["/channel"]
				} else if len(parts) == 3 && parts[2] == "conditions" {
					// /channels/{channel_id}/conditions
					cfg = pageRoutes["/conditions"]
				} else if len(parts) > 3 && parts[2] == "conditions" {
					// /channels/{channel_id}/conditions/{condition_id}
					cfg = pageRoutes["/condition"]
				} else {
					cfg = pageRoutes["/channels"]
				}
			}
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
	var useridstr string
	if user != nil {
		useridstr = strconv.Itoa(user.ID)
	}
	api, _ := controller.Init(s.apiURL, useridstr)

	// Inject cookies from the incoming request into the controller's HTTP client
	// This allows the controller to use the same session as the proxy
	controller.InjectCookies(r)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	lang := i18n.DetectLang(r)
	data := PageData{TitleKey: cfg.TitleKey, User: user, Page: cfg.Name, Lang: lang, I18n: s.i18n.Translator(lang), API: &api}

	// Fetch conditions page data if on /conditions page
	if cfg.Name == "conditions" || cfg.Name == "condition" {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if len(parts) >= 3 && parts[0] == "channels" && parts[2] == "conditions" {
			channelID := parts[1]

			// Check if this is a single condition page (has condition_id)
			if len(parts) >= 4 {
				conditionID := parts[3]
				pageData := controller.PrepareConditionPageData(channelID, conditionID, data.I18n)
				data.CurrentChannel = pageData.CurrentChannel
				data.Condition = pageData.Condition
				data.PlatformMeta = pageData.PlatformMeta
				data.EventFieldOptions = pageData.EventFieldOptions
				data.ConditionTemplates = pageData.ConditionTemplates
				data.ConditionProperties = pageData.ConditionProperties
			} else {
				// This is the conditions list page
				pageData := controller.PrepareConditionsPageData(channelID)
				data.CurrentChannel = pageData.CurrentChannel
				data.Conditions = pageData.Conditions
				data.EventTypes = pageData.EventTypes
				data.PlatformMeta = pageData.PlatformMeta
				data.EventBadgeClass = pageData.EventBadgeClass
				data.EventFieldOptions = pageData.EventFieldOptions
			}
		}
	}

	// Fetch channel detail page data if on /channel page
	if cfg.Name == "channel" {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if len(parts) >= 2 && parts[0] == "channels" {
			channelID := parts[1]
			pageData := controller.PrepareChannelDetailPageData(channelID)
			data.ChannelDetail = pageData.CurrentChannel
			data.ChannelDetailConditions = pageData.CurrentChannel.Conditions
			data.PlatformMeta = pageData.PlatformMeta
			data.EventBadgeClass = pageData.EventBadgeClass
		}
	}

	// Fetch dashboard page data if on /dashboard page
	if cfg.Name == "dashboard" {
		pageData := controller.PrepareDashboardPageData()
		data.Dashboard = pageData
	}

	// Fetch channels page data if on /channels page
	if cfg.Name == "channels" {
		pageData := controller.PrepareChannelsPageData()
		data.Channels = pageData
	}

	// Fetch brand-settings page data if on /brand-settings page
	if cfg.Name == "brand-settings" || cfg.Name == "devices" {
		myBrandSettings := controller.MyBrandSettings{}
		data.MyBrands = myBrandSettings.ListMyBrands()

		brandList := controller.BrandList{}
		data.Brands = brandList.ListAll()

		data.Devices = controller.PrepareDevicesPageData(data.Brands)
	}

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
		return nil
	}
	cookie := r.Header.Get("Cookie")
	req.Header.Set("Cookie", cookie)
	attachIdentityToken(req, s.tokenSource)

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 16384))
	if resp.StatusCode != http.StatusOK {
		return nil
	}

	var user UserProfile
	if err := json.Unmarshal(body, &user); err != nil {
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
func dict(values ...interface{}) (map[string]interface{}, error) {
	if len(values)%2 != 0 {
		return nil, fmt.Errorf("invalid dict call: must have an even number of arguments")
	}

	dict := make(map[string]interface{}, len(values)/2)
	for i := 0; i < len(values); i += 2 {
		key, ok := values[i].(string)
		if !ok {
			return nil, fmt.Errorf("dict keys must be strings")
		}
		dict[key] = values[i+1]
	}
	return dict, nil
}
func dictparams(values ...interface{}) (map[string]interface{}, error) {
	if len(values)%2 != 0 {
		return nil, fmt.Errorf("invalid dict call: must have an even number of arguments")
	}

	dict := make(map[string]interface{}, len(values)/2)
	for i := 0; i < len(values); i += 2 {
		key, ok := values[i].(string)
		if !ok {
			log.Fatalf("Error: dict key must be a string")
			return nil, nil
		}
		var result map[string]string
		err := json.Unmarshal([]byte(values[i+1].(string)), &result)
		if err != nil {
			log.Fatalf("Error unmarshaling JSON: %v", err)
			return nil, nil
		}
		dict[key] = result
	}
	return dict, nil
}
func field(s interface{}, k string) (interface{}, error) {
	if s.(map[string]string) != nil {
		var params = (s).(map[string]string)
		return params[k], nil

	} else {
		v := reflect.Indirect(reflect.ValueOf(s))
		if v.Kind() != reflect.Struct {
			return nil, fmt.Errorf("%T is not a struct", s)
		}
		v = v.FieldByName(k)
		if !v.IsValid() {
			return nil, fmt.Errorf("no field in %T with name %s", s, k)
		}
		return v.Interface(), nil
	}
}

func escapeHTML(s string) string {
	return strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&#34;",
		"'", "&#39;",
	).Replace(s)
}

func formatChannelCount(value int) string {
	if value == 0 {
		return ""
	}
	if value >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(value)/1000000)
	}
	if value >= 1000 {
		return fmt.Sprintf("%.1fK", float64(value)/1000)
	}
	return fmt.Sprintf("%d", value)
}

func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return strings.ToUpper(string(s[0])) + s[1:]
}

func formatTimeAgo(timestamp string) string {
	if timestamp == "" {
		return ""
	}

	// Try multiple date formats
	var t time.Time
	var err error

	// Try RFC3339 first
	t, err = time.Parse(time.RFC3339, timestamp)
	if err != nil {
		// Try Unix timestamp
		if i, parseErr := strconv.ParseInt(timestamp, 10, 64); parseErr == nil {
			t = time.Unix(i, 0)
		} else {
			return timestamp
		}
	}

	now := time.Now()
	diff := now.Sub(t)

	// Calculate time units
	if diff < time.Minute {
		return "just now"
	}
	if diff < time.Hour {
		mins := int(diff.Minutes())
		if mins == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", mins)
	}
	if diff < 24*time.Hour {
		hours := int(diff.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	}
	if diff < 7*24*time.Hour {
		days := int(diff.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	}

	// For dates further back, show the date
	return t.Format("2006-01-02")
}

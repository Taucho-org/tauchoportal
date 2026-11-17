package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// sharedHTTPClient has no cookie jar on purpose: cookies belong to a single
// visitor's request and are attached per request by session.
var sharedHTTPClient = &http.Client{Timeout: 30 * time.Second}

// session holds what one incoming page request needs to call the API on
// behalf of its visitor. Each request gets its own session, so concurrent
// visitors never share a user ID or cookies.
type session struct {
	baseURL string
	userID  string
	cookie  string
	client  *http.Client
}

type API struct {
	Health            Health
	Auth              Auth
	Watches           Watches
	StreamEvents      StreamEvents
	Conditions        Conditions
	Devices           Devices
	DeviceCredentials DeviceCredentials
	DeviceTemplates   DeviceTemplates
	DeviceGroups      DeviceGroups
	Streams           Streams
	Poller            Poller
	PlatformDiscovery PlatformDiscovery
	Catalog           Catalog
	CustomProducts    CustomProducts
	LiveEvents        LiveEvents
	EventMetadata     EventMetadata
	Dashboard         Dashboard
	BrandList         BrandList
	MyBrandSettings   MyBrandSettings
	OAuth             OAuth
	PlatformConfig    PlatformConfig
}

type Request interface {
}

// New returns an API bound to one incoming request: calls carry that
// visitor's cookies (the API verifies the session cookie) and user ID.
// incoming may be nil for calls that need no session.
func New(apiURL string, userID string, incoming *http.Request) *API {
	s := &session{baseURL: apiURL, userID: userID, client: sharedHTTPClient}
	if incoming != nil {
		s.cookie = incoming.Header.Get("Cookie")
	}
	return newAPI(s)
}

func newAPI(s *session) *API {
	return &API{
		Health:            Health{s: s},
		Auth:              Auth{s: s},
		Watches:           Watches{s: s},
		StreamEvents:      StreamEvents{s: s},
		Conditions:        Conditions{s: s},
		Devices:           Devices{s: s},
		DeviceCredentials: DeviceCredentials{s: s},
		DeviceTemplates:   DeviceTemplates{s: s},
		DeviceGroups:      DeviceGroups{s: s},
		Streams:           Streams{s: s},
		Poller:            Poller{s: s},
		PlatformDiscovery: PlatformDiscovery{s: s},
		Catalog:           Catalog{s: s},
		CustomProducts:    CustomProducts{s: s},
		LiveEvents:        LiveEvents{s: s},
		EventMetadata:     EventMetadata{s: s},
		Dashboard:         Dashboard{s: s},
		BrandList:         BrandList{s: s},
		MyBrandSettings:   MyBrandSettings{s: s},
		OAuth:             OAuth{s: s},
		PlatformConfig:    PlatformConfig{s: s},
	}
}

func (s *session) apiRequest(response any, method string, path string, request ...Request) {
	if s == nil {
		log.Printf("controller: API call %s %s without a request session", method, path)
		return
	}
	baseURL := s.baseURL
	if strings.HasSuffix(baseURL, "/") && strings.HasPrefix(path, "/") {
		path = path[1:]
	}
	if !strings.HasSuffix(baseURL, "/") && !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	var body io.Reader
	hasBody := method == http.MethodPost || method == http.MethodPatch || method == http.MethodPut
	if hasBody {
		// Encodes the variadic slice exactly as the previous implementation did.
		jsonBytes, err := json.Marshal(request)
		if err != nil {
			log.Printf("controller: encoding %s %s body: %v", method, path, err)
			return
		}
		body = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, baseURL+path, body)
	if err != nil {
		log.Printf("controller: building %s %s: %v", method, path, err)
		return
	}
	// The API identifies the user from the session cookie. X-User-ID is still
	// sent so this portal keeps working against API versions that read it.
	if s.userID != "" {
		req.Header.Set("X-User-ID", s.userID)
	}
	if s.cookie != "" {
		req.Header.Set("Cookie", s.cookie)
	}
	if hasBody {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Println("Request failed:", err)
		return
	}
	defer resp.Body.Close()
	if method != http.MethodDelete {
		json.NewDecoder(resp.Body).Decode(response)
	}
}

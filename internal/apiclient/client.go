package apiclient

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
)

// Client handles communication with the tauchoportal API server
type Client struct {
	baseURL string
	http    *http.Client
}

// OAuthLoginResponse represents the response from GET /oauth/login
type OAuthLoginResponse struct {
	AuthURL string `json:"auth_url"`
}

// UserInfo represents a user profile from the API
type UserInfo struct {
	ID       int    `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Picture  string `json:"picture,omitempty"`
}

// NewClient creates a new API client
func NewClient() *Client {
	baseURL := os.Getenv("API_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081" // Default for local development
	}

	// Ensure no trailing slash
	if len(baseURL) > 0 && baseURL[len(baseURL)-1] == '/' {
		baseURL = baseURL[:len(baseURL)-1]
	}

	return &Client{
		baseURL: baseURL,
		http:    &http.Client{},
	}
}

// GetBaseURL returns the API base URL (useful for logging)
func (c *Client) GetBaseURL() string {
	return c.baseURL
}

// GetOAuthLoginURL calls the API to get the OAuth login URL
func (c *Client) GetOAuthLoginURL(provider string) (*OAuthLoginResponse, error) {
	fullURL := fmt.Sprintf("%s/oauth/login?provider=%s", c.baseURL, url.QueryEscape(provider))

	resp, err := c.http.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch OAuth login URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result OAuthLoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode OAuth login response: %w", err)
	}

	return &result, nil
}

// IsAuthenticated checks if the user has a valid session by calling the API
func (c *Client) IsAuthenticated(r *http.Request) (bool, error) {
	fullURL := fmt.Sprintf("%s/auth/user", c.baseURL)

	// Create a new request with the same cookies
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return false, err
	}

	// Copy cookies from original request
	req.Header.Set("Cookie", r.Header.Get("Cookie"))

	resp, err := c.http.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}

// GetUserProfile retrieves the authenticated user's profile from the API
func (c *Client) GetUserProfile(r *http.Request) (*UserInfo, error) {
	fullURL := fmt.Sprintf("%s/auth/user", c.baseURL)

	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	// Copy cookies from original request
	req.Header.Set("Cookie", r.Header.Get("Cookie"))

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var user UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user profile: %w", err)
	}

	return &user, nil
}

package controller

import (
	"net/http"
)

// MyBrandSettings handles user's connected brands from /auth/brands endpoint
type MyBrandSettings struct{}

// MyConnectedBrand represents a brand with connection status from the /auth/brands API
type MyConnectedBrand struct {
	ID                       string                 `json:"id"`
	Name                     string                 `json:"name"`
	IsConnected              bool                   `json:"is_connected"`
	AuthType                 *string                `json:"auth_type"`
	Status                   *string                `json:"status"`
	ConnectedAt              *string                `json:"connected_at"`
	LastTestedAt             *string                `json:"last_tested_at"`
	LastUsedAt               *string                `json:"last_used_at"`
	ErrorMessage             *string                `json:"error_message"`
	OAuthScope               *string                `json:"oauth_scope"`
	CredentialFields         []BrandCredentialField `json:"credential_fields"`
	RequiresBrandCredentials bool                   `json:"requires_brand_credentials"`
}

// BrandCredentialField represents a single credential input field for brand connection
type BrandCredentialField struct {
	Name     string `json:"name"`
	Label    string `json:"label"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
	Help     string `json:"help"`
}

// MyBrandsListResponse wraps the API response for /auth/brands
type MyBrandsListResponse struct {
	Brands []MyConnectedBrand `json:"brands"`
}

// ListMyBrands fetches all connected brands with status from API
func (MyBrandSettings) ListMyBrands() []MyConnectedBrand {
	var response MyBrandsListResponse
	apiRequest(&response, http.MethodGet, "/auth/brands")
	return response.Brands
}

// GetMyBrandDetails fetches a specific connected brand with credential fields
func (MyBrandSettings) GetMyBrandDetails(brandID string) MyConnectedBrand {
	var result MyConnectedBrand
	apiRequest(&result, http.MethodGet, "/auth/brand/"+brandID)
	return result
}

// BrandList handles all available brands from /catalog/brands endpoint
type BrandList struct{}

// CatalogBrand represents a brand from the catalog API response
type CatalogBrand struct {
	ID                            string                         `json:"id"`
	Name                          string                         `json:"name"`
	Website                       *string                        `json:"website"`
	LogoURL                       *string                        `json:"logo_url"`
	Icon                          *string                        `json:"icon"`
	BrandColor                    *string                        `json:"brand_color"`
	AffiliateURL                  *string                        `json:"affiliate_url"`
	AffiliateCommissionPct        *float64                       `json:"affiliate_commission_percent"`
	AuthenticationType            *string                        `json:"authentication_type"`
	RequiresToken                 *bool                          `json:"requires_token"`
	DocsURL                       *string                        `json:"docs_url"`
	DocsLabel                     *string                        `json:"docs_label"`
	CredentialFields              []BrandCredentialField         `json:"credential_fields"`
	DeviceIdentificationRequireds []DeviceIdentificationRequired `json:"device_identification_required"`
	SortOrder                     int                            `json:"sort_order"`
	IsActive                      bool                           `json:"is_active"`
	CreatedAt                     *string                        `json:"created_at"`
	UpdatedAt                     *string                        `json:"updated_at"`
}

// CatalogBrandsResponse wraps the API response for /catalog/brands
type CatalogBrandsResponse struct {
	Brands []CatalogBrand `json:"brands"`
}

// ListAll fetches all available brands from catalog API
func (BrandList) ListAll() []CatalogBrand {
	var response []CatalogBrand
	apiRequest(&response, http.MethodGet, "/catalog/brands?active_only=true")
	return response
}

// Get fetches a specific brand from catalog API
func (BrandList) Get(brandID string) CatalogBrand {
	var result CatalogBrand
	apiRequest(&result, http.MethodGet, "/catalog/brands/get?id="+brandID)
	return result
}

package controller

import (
	"net/http"
	"net/url"
	"strconv"
)

type Catalog struct{}

type Brand struct {
	Id                            string                         `json:"id"`
	Name                          string                         `json:"name"`
	Website                       string                         `json:"website"`
	LogoUrl                       string                         `json:"logo_url"`
	BrandColor                    string                         `json:"brand_color"`
	AffiliateUrl                  string                         `json:"affiliate_url"`
	AffiliateCommissionPercent    float64                        `json:"affiliate_commission_percent"`
	RequiresBrandCredentials      bool                           `json:"requires_brand_credentials"`
	SortOrder                     int                            `json:"sort_order"`
	IsActive                      bool                           `json:"is_active"`
	CreatedAt                     string                         `json:"created_at"`
	UpdatedAt                     string                         `json:"updated_at"`
	Icon                          string                         `json:"icon"`
	CredentialFields              []CredentialField              `json:"credential_fields"`
	DeviceIdentificationRequireds []DeviceIdentificationRequired `json:"device_identification_required"`
	DocsUrl                       string                         `json:"docs_url"`
	DocsLabel                     string                         `json:"docs_label"`
}

type CredentialField struct {
	Id          string `json:"id"`
	Label       string `json:"label"`
	Type        string `json:"type"` // "text", "password", "info"
	Help        string `json:"help"`
	Placeholder string `json:"placeholder"`
}

type DeviceIdentificationRequired struct {
	Type        string `json:"type"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Placeholder string `json:"placeholder"`
	Required    bool   `json:"required"`
}

type Product struct {
	BrandId          string   `json:"brand_id"`
	Id               string   `json:"id"`
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	ThumbnailUrl     string   `json:"thumbnail_url"`
	Price            string   `json:"price"`
	PriceRange       string   `json:"priceRange"`
	SupportedActions []string `json:"supported_actions"`
	IsActive         bool     `json:"is_active"`
	CreatedAt        string   `json:"created_at"`
	UpdatedAt        string   `json:"updated_at"`
}

type ListBrandsResponse []Brand

type GetBrandResponse struct {
	Brand    Brand     `json:"brand"`
	Products []Product `json:"products"`
}

type CreateBrandRequest struct {
	Id                         string  `json:"id"`
	Name                       string  `json:"name"`
	Website                    string  `json:"website"`
	LogoUrl                    string  `json:"logo_url"`
	BrandColor                 string  `json:"brand_color"`
	AffiliateUrl               string  `json:"affiliate_url"`
	AffiliateCommissionPercent float64 `json:"affiliate_commission_percent"`
	RequiresBrandCredentials   bool    `json:"requires_brand_credentials"`
	SortOrder                  int     `json:"sort_order"`
	IsActive                   bool    `json:"is_active"`
}

type CreateBrandResponse = Brand

type UpdateBrandRequest struct {
	Name                     string `json:"name"`
	Website                  string `json:"website"`
	BrandColor               string `json:"brand_color"`
	RequiresBrandCredentials bool   `json:"requires_brand_credentials"`
	IsActive                 bool   `json:"is_active"`
}

type UpdateBrandResponse = Brand

type DeleteBrandResponse struct {
	Status string `json:"status"`
}

type ListProductsResponse []Product
type GetProductResponse = Product

type CreateProductRequest struct {
	Id               string   `json:"id"`
	BrandId          string   `json:"brand_id"`
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	ThumbnailUrl     string   `json:"thumbnail_url"`
	SupportedActions []string `json:"supported_actions"`
	IsActive         bool     `json:"is_active"`
}

type CreateProductResponse = Product

type UpdateProductRequest struct {
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	ThumbnailUrl     string   `json:"thumbnail_url"`
	SupportedActions []string `json:"supported_actions"`
	IsActive         bool     `json:"is_active"`
}

type UpdateProductResponse = Product

type DeleteProductResponse struct {
	Status string `json:"status"`
}

func (Catalog) ListBrands(activeOnly bool) ListBrandsResponse {
	path := "/catalog/brands"
	path += "?active_only=" + url.QueryEscape(strconv.FormatBool(activeOnly))

	var result ListBrandsResponse
	apiRequest(&result, http.MethodGet, path)
	return result
}

func (Catalog) GetBrand(id string) GetBrandResponse {
	var result GetBrandResponse
	apiRequest(&result, http.MethodGet, "/catalog/brands/get?id="+url.QueryEscape(id))
	return result
}

func (Catalog) CreateBrand(request CreateBrandRequest) CreateBrandResponse {
	var result CreateBrandResponse
	apiRequest(&result, http.MethodPost, "/catalog/brands", request)
	return result
}

func (Catalog) UpdateBrand(id string, request UpdateBrandRequest) UpdateBrandResponse {
	var result UpdateBrandResponse
	apiRequest(&result, http.MethodPatch, "/catalog/brands/update?id="+url.QueryEscape(id), request)
	return result
}

func (Catalog) DeleteBrand(id string) DeleteBrandResponse {
	var result DeleteBrandResponse
	apiRequest(&result, http.MethodDelete, "/catalog/brands?id="+url.QueryEscape(id))
	return result
}

func (Catalog) ListProducts(brandId string, activeOnly bool) ListProductsResponse {
	path := "/catalog/products"
	path += "?brand_id=" + url.QueryEscape(brandId) + "&active_only=" + url.QueryEscape(strconv.FormatBool(activeOnly))

	var result ListProductsResponse
	apiRequest(&result, http.MethodGet, path)
	return result
}

func (Catalog) GetProduct(id string) GetProductResponse {
	var result GetProductResponse
	apiRequest(&result, http.MethodGet, "/catalog/products/get?id="+url.QueryEscape(id))
	return result
}

func (Catalog) CreateProduct(request CreateProductRequest) CreateProductResponse {
	var result CreateProductResponse
	apiRequest(&result, http.MethodPost, "/catalog/products", request)
	return result
}

func (Catalog) UpdateProduct(id string, request UpdateProductRequest) UpdateProductResponse {
	var result UpdateProductResponse
	apiRequest(&result, http.MethodPatch, "/catalog/products/update?id="+url.QueryEscape(id), request)
	return result
}

func (Catalog) DeleteProduct(id string) DeleteProductResponse {
	var result DeleteProductResponse
	apiRequest(&result, http.MethodDelete, "/catalog/products?id="+url.QueryEscape(id))
	return result
}

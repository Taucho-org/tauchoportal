package controller

import (
	"net/http"
	"net/url"
)

type CustomProducts struct{ s *session }

type CustomProduct struct {
	Id          string `json:"id"`
	UserId      int    `json:"user_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type CustomActionHTTPHeaders struct {
	Authorization string `json:"Authorization"`
}

type CustomAction struct {
	Id               string                  `json:"id"`
	CustomProductId  string                  `json:"custom_product_id"`
	ActionName       string                  `json:"action_name"`
	HttpMethod       string                  `json:"http_method"`
	HttpUrl          string                  `json:"http_url"`
	HttpHeaders      CustomActionHTTPHeaders `json:"http_headers"`
	HttpBodyTemplate string                  `json:"http_body_template"`
	CreatedAt        string                  `json:"created_at"`
}

type ListCustomProductsResponse []CustomProduct

type GetCustomProductResponse struct {
	Product CustomProduct  `json:"product"`
	Actions []CustomAction `json:"actions"`
}

type CreateCustomProductRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreateCustomProductResponse = CustomProduct

type UpdateCustomProductRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateCustomProductResponse = CustomProduct

type DeleteCustomProductResponse struct {
	Status string `json:"status"`
}

type ListCustomActionsResponse []CustomAction

type GetCustomActionResponse struct {
	Action  CustomAction  `json:"action"`
	Product CustomProduct `json:"product"`
}

type CreateCustomActionRequest struct {
	CustomProductId  string                  `json:"custom_product_id"`
	ActionName       string                  `json:"action_name"`
	HttpMethod       string                  `json:"http_method"`
	HttpUrl          string                  `json:"http_url"`
	HttpHeaders      CustomActionHTTPHeaders `json:"http_headers"`
	HttpBodyTemplate string                  `json:"http_body_template"`
}

type CreateCustomActionResponse = CustomAction

type UpdateCustomActionRequest struct {
	ActionName       string                  `json:"action_name"`
	HttpMethod       string                  `json:"http_method"`
	HttpUrl          string                  `json:"http_url"`
	HttpHeaders      CustomActionHTTPHeaders `json:"http_headers"`
	HttpBodyTemplate string                  `json:"http_body_template"`
}

type UpdateCustomActionResponse = CustomAction

type DeleteCustomActionResponse struct {
	Status string `json:"status"`
}

func (ctl CustomProducts) ListCustomProducts() ListCustomProductsResponse {
	var result ListCustomProductsResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/custom-products")
	return result
}

func (ctl CustomProducts) GetCustomProduct(id string) GetCustomProductResponse {
	var result GetCustomProductResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/custom-products/get?id="+url.QueryEscape(id))
	return result
}

func (ctl CustomProducts) CreateCustomProduct(request CreateCustomProductRequest) CreateCustomProductResponse {
	var result CreateCustomProductResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/custom-products", request)
	return result
}

func (ctl CustomProducts) UpdateCustomProduct(id string, request UpdateCustomProductRequest) UpdateCustomProductResponse {
	var result UpdateCustomProductResponse
	ctl.s.apiRequest(&result, http.MethodPatch, "/custom-products/update?id="+url.QueryEscape(id), request)
	return result
}

func (ctl CustomProducts) DeleteCustomProduct(id string) DeleteCustomProductResponse {
	var result DeleteCustomProductResponse
	ctl.s.apiRequest(&result, http.MethodDelete, "/custom-products?id="+url.QueryEscape(id))
	return result
}

func (ctl CustomProducts) ListCustomActions(productId string) ListCustomActionsResponse {
	path := "/custom-actions"
	if productId != "" {
		path += "?product_id=" + url.QueryEscape(productId)
	}

	var result ListCustomActionsResponse
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl CustomProducts) GetCustomAction(id string) GetCustomActionResponse {
	var result GetCustomActionResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/custom-actions/get?id="+url.QueryEscape(id))
	return result
}

func (ctl CustomProducts) CreateCustomAction(request CreateCustomActionRequest) CreateCustomActionResponse {
	var result CreateCustomActionResponse
	ctl.s.apiRequest(&result, http.MethodPost, "/custom-actions", request)
	return result
}

func (ctl CustomProducts) UpdateCustomAction(id string, request UpdateCustomActionRequest) UpdateCustomActionResponse {
	var result UpdateCustomActionResponse
	ctl.s.apiRequest(&result, http.MethodPatch, "/custom-actions/update?id="+url.QueryEscape(id), request)
	return result
}

func (ctl CustomProducts) DeleteCustomAction(id string) DeleteCustomActionResponse {
	var result DeleteCustomActionResponse
	ctl.s.apiRequest(&result, http.MethodDelete, "/custom-actions?id="+url.QueryEscape(id))
	return result
}

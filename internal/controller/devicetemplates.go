package controller

import (
	"net/http"
	"net/url"
	"strconv"
)

type DeviceTemplates struct{}

type DeviceTemplateUIField struct {
	Name    string        `json:"name"`
	Key     string        `json:"key"`
	Options []interface{} `json:"options"`
	Type    string        `json:"type"`
	Min     int           `json:"min"`
	Max     int           `json:"max"`
}

type DeviceTemplateExample struct {
	PowerState string `json:"power_state"`
	Brightness *int   `json:"brightness"`
}

type DeviceTemplateExamples struct {
	On  DeviceTemplateExample `json:"on"`
	Off DeviceTemplateExample `json:"off"`
}

type DeviceTemplate struct {
	Id                     int                     `json:"id"`
	BrandName              string                  `json:"brand_name"`
	TemplateName           string                  `json:"template_name"`
	Category               string                  `json:"category"`
	Description            string                  `json:"description"`
	HttpMethod             string                  `json:"http_method"`
	RequiredParameters     []string                `json:"required_parameters"`
	OptionalParameters     []string                `json:"optional_parameters"`
	ParameterDefaults      map[string]interface{}  `json:"parameter_defaults"`
	ParameterConstraints   map[string]interface{}  `json:"parameter_constraints"`
	UiFields               []DeviceTemplateUIField `json:"ui_fields"`
	RequiresAuthentication bool                    `json:"requires_authentication"`
	LocalNetworkOnly       bool                    `json:"local_network_only"`
	Notes                  string                  `json:"notes"`
	EndpointUrl            *string                 `json:"endpoint_url"`
	AuthenticationType     *string                 `json:"authentication_type"`
	AuthHeader             *string                 `json:"auth_header"`
	BodyTemplate           *string                 `json:"body_template"`
	Examples               *DeviceTemplateExamples `json:"examples"`
	SupportsBatchCommands  *bool                   `json:"supports_batch_commands"`
	CreatedAt              *string                 `json:"created_at"`
	UpdatedAt              *string                 `json:"updated_at"`
}

type ListTemplatesResponse []DeviceTemplate
type ListTemplatesByBrandResponse []DeviceTemplate
type ListTemplatesByCategoryResponse []DeviceTemplate
type GetTemplateResponse = DeviceTemplate

func (DeviceTemplates) ListTemplates() ListTemplatesResponse {
	var result ListTemplatesResponse
	apiRequest(&result, http.MethodGet, "/device-templates")
	return result
}

func (DeviceTemplates) ListTemplatesByBrand(brand string) ListTemplatesByBrandResponse {
	var result ListTemplatesByBrandResponse
	apiRequest(&result, http.MethodGet, "/device-templates?brand="+url.QueryEscape(brand))
	return result
}

func (DeviceTemplates) ListTemplatesByCategory(category string) ListTemplatesByCategoryResponse {
	var result ListTemplatesByCategoryResponse
	apiRequest(&result, http.MethodGet, "/device-templates?category="+url.QueryEscape(category))
	return result
}

func (DeviceTemplates) GetTemplate(id int) GetTemplateResponse {
	var result GetTemplateResponse
	apiRequest(&result, http.MethodGet, "/device-templates/get?id="+url.QueryEscape(strconv.Itoa(id)))
	return result
}

package i18n

import (
	"encoding/json"
	"testing"
)

func TestJSByPrefixIncludesCommonCatalogAndRequestedBrand(t *testing.T) {
	translator := &Translator{strings: map[string]string{
		"catalog.noResults":        "No products",
		"catalog.unicornTitle":     "Unicorn",
		"catalog.amazon.title":     "Amazon",
		"catalog.common.loading":   "Loading",
		"catalog.unicorn.subtitle": "Unicorn subtitle",
		"devices.title":            "Devices",
	}}

	var translations map[string]string
	if err := json.Unmarshal([]byte(translator.JSByPrefix([]string{"catalog.common", "catalog.unicorn"})), &translations); err != nil {
		t.Fatalf("unmarshal prefix translations: %v", err)
	}

	for key, want := range map[string]string{
		"catalog.noResults":        "No products",
		"catalog.unicornTitle":     "Unicorn",
		"catalog.common.loading":   "Loading",
		"catalog.unicorn.subtitle": "Unicorn subtitle",
	} {
		if got := translations[key]; got != want {
			t.Errorf("translation %q = %q, want %q", key, got, want)
		}
	}

	for _, key := range []string{"catalog.amazon.title", "devices.title"} {
		if _, ok := translations[key]; ok {
			t.Errorf("unexpected translation included: %q", key)
		}
	}
}

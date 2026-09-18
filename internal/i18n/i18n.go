package i18n

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"
)

//go:embed locales/en.json
var enJSON []byte

//go:embed locales/ja.json
var jaJSON []byte

//go:embed locales/de.json
var deJSON []byte

//go:embed locales/fr.json
var frJSON []byte

//go:embed locales/es.json
var esJSON []byte

//go:embed locales/zh.json
var zhJSON []byte

//go:embed locales/ko.json
var koJSON []byte

var supported = []string{"en", "ja", "de", "fr", "es", "zh", "ko"}

const CookieName = "taucho_language"

// Bundle holds all loaded locale translations.
type Bundle struct {
	locales map[string]map[string]string
}

// Load parses all embedded locale JSON files and returns a Bundle.
// Panics on malformed JSON (caught at startup, not in production traffic).
func Load() *Bundle {
	b := &Bundle{locales: make(map[string]map[string]string)}
	for lang, data := range map[string][]byte{
		"en": enJSON, "ja": jaJSON, "de": deJSON, "fr": frJSON, "es": esJSON, "zh": zhJSON, "ko": koJSON,
	} {
		var m map[string]string
		if err := json.Unmarshal(data, &m); err != nil {
			panic("i18n: failed to parse " + lang + ".json: " + err.Error())
		}
		b.locales[lang] = m
	}
	return b
}

// Translator returns a Translator bound to the given language code.
// Falls back to English if the code is unknown.
func (b *Bundle) Translator(lang string) *Translator {
	m := b.locales[lang]
	if m == nil {
		m = b.locales["en"]
	}
	return &Translator{strings: m}
}

// DetectLang picks the best language for a request.
// Priority: taucho_language cookie > Accept-Language header > "en".
func DetectLang(r *http.Request) string {
	if c, err := r.Cookie(CookieName); err == nil {
		for _, s := range supported {
			if c.Value == s {
				return s
			}
		}
	}
	for _, part := range strings.Split(r.Header.Get("Accept-Language"), ",") {
		tag := strings.ToLower(strings.SplitN(strings.TrimSpace(part), ";", 2)[0])
		lang := strings.SplitN(tag, "-", 2)[0]
		for _, s := range supported {
			if lang == s {
				return s
			}
		}
	}
	return "en"
}

// Supported returns the list of supported language codes.
func Supported() []string { return supported }

// Translator provides translation lookup for a single language.
type Translator struct {
	strings map[string]string
}

// T returns the translation for key, falling back to key itself if not found.
func (t *Translator) T(key string, replacement ...string) string {
	if v, ok := t.strings[key]; ok {
		for i, r := range replacement {
			v = strings.ReplaceAll(v, fmt.Sprintf("{%d}", i), r)
		}
		return v
	}
	return key
}

// TByPrefix returns all translations that start with the given prefix as a map.
// Useful for retrieving sets of related translations (e.g., all "condition.*" keys).
func (t *Translator) TByPrefix(prefix string) map[string]string {
	result := make(map[string]string)
	for key, value := range t.strings {
		if strings.HasPrefix(key, prefix) {
			// Remove the prefix and dot from the key for easier access
			shortKey := strings.TrimPrefix(key, prefix+".")
			result[shortKey] = value
		}
	}
	return result
}

// TH returns the translation for key as template.HTML (unescaped).
// Use this for translations that contain safe HTML markup like <wbr />, <strong>, etc.
// DO NOT use this with user-supplied data or untrusted input!
func (t *Translator) TH(key string) template.HTML {
	if v, ok := t.strings[key]; ok {
		return template.HTML(v)
	}
	return template.HTML(key)
}

// JS returns all strings as a JSON object safe for inline <script> injection.
func (t *Translator) JS() template.JS {
	b, _ := json.Marshal(t.strings)
	return template.JS(b)
}

// JSByPrefix returns translations matching the given prefixes as a JSON object.
// Useful for limiting i18n data embedded in pages (e.g., only catalog.common and catalog.govee).
// Removes prefix from keys for easier access (e.g., "catalog.loading" → "loading").
func (t *Translator) JSByPrefix(prefixes []string) template.JS {
	result := make(map[string]string)
	if t == nil || t.strings == nil {
		b, _ := json.Marshal(result)
		return template.JS(b)
	}
	for key, value := range t.strings {
		for _, prefix := range prefixes {
			if strings.HasPrefix(key, prefix+".") {
				result[key] = value
				break
			}
		}
	}
	b, _ := json.Marshal(result)
	return template.JS(b)
}

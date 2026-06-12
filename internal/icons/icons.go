package icons

import (
	"bytes"
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"strings"
)

// Embed all SVG files from the icons directory.
//go:embed *.svg
var iconFiles embed.FS

var all = make(map[string]string)

func init() {
	// Load all SVG files from embedded filesystem
	entries, err := fs.ReadDir(iconFiles, ".")
	if err != nil {
		// If we can't read embedded files, all will remain empty
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		// Only process .svg files
		name := entry.Name()
		if !strings.HasSuffix(name, ".svg") {
			continue
		}

		// Read file contents
		content, err := fs.ReadFile(iconFiles, name)
		if err != nil {
			continue
		}

		// Remove .svg extension and use as key
		key := strings.TrimSuffix(name, ".svg")
		all[key] = string(content)
	}
}

// Get returns the SVG icon for the named platform as safe HTML for template injection.
func Get(name string) template.HTML {
	if s, ok := all[name]; ok {
		return template.HTML(s)
	}
	return ""
}

// AllJSON returns all icons serialized as a JS-safe JSON object for window.__platformIcons.
func AllJSON() template.JS {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(all)
	return template.JS(bytes.TrimRight(buf.Bytes(), "\n"))
}

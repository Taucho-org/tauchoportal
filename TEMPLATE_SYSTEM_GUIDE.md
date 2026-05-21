# Template/Layout System Options

You now have **3 ways** to avoid repeating header/footer on every page:

## Option 1: JavaScript Component Loader (Simplest)

Load components dynamically at runtime using `components.js`.

### Usage

```html
<!-- Any page: public/streams.html, public/dashboard.html, etc. -->
<!DOCTYPE html>
<html>
<head>
    <title>Streams</title>
    <link rel="stylesheet" href="/css/main.css">
    <script src="/js/translations.js"></script>
    <script src="/js/localization.js"></script>
    <script src="/js/components.js"></script>
</head>
<body>
    <!-- Your page content here -->
    <main class="content">
        <h1>Your Page Content</h1>
    </main>

    <script>
        // Load header and footer
        loadComponents(['header', 'footer']);
        
        // Initialize localization
        initLocalization();
        
        // Your page logic
        requireAuth();
    </script>
</body>
</html>
```

### Adding New Components

1. Create a new file: `public/components/sidebar.html`
2. Include your HTML/CSS/JS
3. Load with: `loadComponent('sidebar')`

### Pros
- ✅ Simple, no build step
- ✅ Works with static files
- ✅ Easy to add components

### Cons
- ❌ Components load after page render (slight delay)
- ❌ More HTTP requests

---

## Option 2: Web Components (Modern)

Use native browser custom elements.

### Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>Streams</title>
    <link rel="stylesheet" href="/css/main.css">
    <script src="/js/translations.js"></script>
    <script src="/js/localization.js"></script>
    <script src="/js/web-components.js"></script>
</head>
<body>
    <!-- Custom elements -->
    <taucho-header></taucho-header>

    <main class="content">
        <h1>Your Page Content</h1>
    </main>

    <taucho-footer></taucho-footer>

    <script>
        initLocalization();
        requireAuth();
    </script>
</body>
</html>
```

### Creating Custom Components

```javascript
class MyCustomComponent extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `<div>Content here</div>`;
  }
}

customElements.define('my-component', MyCustomComponent);
```

### Using It

```html
<my-component></my-component>
```

### Pros
- ✅ Modern standard API
- ✅ Encapsulated styles (no CSS conflicts)
- ✅ Reusable across frameworks
- ✅ Better performance

### Cons
- ❌ Requires modern browser support (99%+ coverage)
- ❌ Slightly more complex

---

## Option 3: Go Server-Side Templates (Full Control)

Move to server-side rendering with Go templates. Best for dynamic content.

### Setup

```go
// cmd/main.go
package main

import (
    "html/template"
    "net/http"
)

var templates *template.Template

func init() {
    // Load base template and all pages
    templates = template.Must(template.ParseGlob("public/*.html"))
}

// Base template: public/base.html
type Page struct {
    Title string
    Content template.HTML
}

func servePage(w http.ResponseWriter, r *http.Request, page string, data interface{}) {
    templates.ExecuteTemplate(w, "base", map[string]interface{}{
        "Page": page,
        "Data": data,
    })
}

func handleStreams(w http.ResponseWriter, r *http.Request) {
    servePage(w, r, "streams", nil)
}
```

### Base Template: `public/base.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>{{ .Title }} - TauchoPortal</title>
    <link rel="stylesheet" href="/css/main.css">
    <script src="/js/translations.js"></script>
    <script src="/js/localization.js"></script>
</head>
<body>
    <!-- Header is defined once -->
    {{ template "header" }}

    <!-- Page content injected here -->
    {{ template .Page .Data }}

    <!-- Footer is defined once -->
    {{ template "footer" }}

    <script>
        initLocalization();
    </script>
</body>
</html>
```

### Page Template: `public/streams.html`

```html
{{ define "streams" }}
<main class="content">
    <h1>Streams</h1>
    <!-- Page-specific content -->
</main>
{{ end }}
```

### Pros
- ✅ No duplication at all
- ✅ Single source of truth
- ✅ Best performance
- ✅ Server-side logic integration

### Cons
- ❌ Requires server-side changes
- ❌ No longer "static" files
- ❌ More setup

---

## Recommendation

| Scenario | Best Option |
|----------|------------|
| Quick setup, minimal changes | **Option 1: JS Components** |
| Modern approach, no build | **Option 2: Web Components** |
| Maximum control, dynamic content | **Option 3: Go Templates** |

### For Your Setup Now
Use **Option 2 (Web Components)** because:
- Modern and standard
- No extra HTTP requests
- Works with your current setup
- Better encapsulation

---

## Quick Comparison

```html
<!-- Option 1: JavaScript Loader -->
<script>
  loadComponents(['header', 'footer']);
</script>

<!-- Option 2: Web Components -->
<taucho-header></taucho-header>
<!-- ... content ... -->
<taucho-footer></taucho-footer>

<!-- Option 3: Go Templates -->
<!-- Everything handled server-side, single HTML file -->
```

---

## Files Available

### Option 1 (JS Components)
- `public/js/components.js` - Component loader
- `public/components/header.html` - Header component
- `public/components/footer.html` - Footer component

### Option 2 (Web Components)
- `public/js/web-components.js` - Includes all components
- No separate files needed

### Option 3 (Go Templates)
- Not yet implemented (guide above shows how)

---

## Next Steps

1. Choose an option
2. Update your pages to use it
3. All pages automatically get header/footer
4. Language switching works on all pages
5. Add new components without duplication

All components are **translation-aware** and update when language changes!

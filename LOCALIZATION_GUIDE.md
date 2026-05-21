# Localization Setup Guide

## Overview

Your website now supports multi-language localization with:
- ✅ Automatic browser language detection
- ✅ Cookie-based language preference storage (instant, no API lag)
- ✅ Optional sync to API for authenticated users (cross-device persistence)
- ✅ Language selector dropdown in the UI
- ✅ Support for: English, Japanese, German, French, Spanish

## How It Works

### On Page Load

1. **Check cookie** - If user already selected a language, use it
2. **Detect browser language** - If no cookie, detect browser language (e.g., browser set to 日本語 → uses ja)
3. **Save to cookie** - Language preference is stored for 365 days
4. **Apply translations** - All `data-i18n` elements are updated with translations
5. **Sync to API** (optional, if authenticated) - User preference stored in database for cross-device sync

### When User Changes Language

1. Click the language dropdown selector
2. Select a language
3. All UI text updates instantly
4. Language is saved to cookie (immediately)
5. If authenticated, preference syncs to API in background

## How to Add Translations

### 1. Add Keys to translations.js

In [public/js/translations.js](public/js/translations.js), add your translation strings:

```javascript
const TRANSLATIONS = {
  en: {
    'my.newKey': 'Hello World',
  },
  ja: {
    'my.newKey': 'こんにちは世界',
  },
  // ... other languages
};
```

### 2. Mark Elements in HTML

Use `data-i18n` attribute for element text:

```html
<!-- Text content -->
<h1 data-i18n="streams.title">Stream Management</h1>

<!-- Placeholder text -->
<input 
  type="text" 
  data-i18n-placeholder="modal.streamNamePlaceholder" 
  placeholder="e.g., Gaming Stream"
>
```

### 3. Reference in JavaScript

```javascript
// Get translation string
const text = t('streams.title'); // Gets current language
const text = t('streams.title', 'ja'); // Force Japanese
```

## API Integration (Optional)

To persist language preference across devices, add this endpoint to your API:

### API Endpoint: `POST /api/user/preferences`

**Request:**
```json
{
  "language": "ja"
}
```

**Response:**
```json
{
  "language": "ja",
  "updated_at": "2026-05-20T12:00:00Z"
}
```

### API Endpoint: `GET /api/user/preferences`

**Response:**
```json
{
  "language": "ja",
  "theme": "dark",
  "updated_at": "2026-05-20T12:00:00Z"
}
```

When these endpoints exist, the localization system will:
1. Load user's saved preference on page load
2. Sync preference when user changes language
3. Work seamlessly across devices

## JavaScript Functions

### Public API

```javascript
// Get current language
getCurrentLanguage() // Returns: 'en', 'ja', 'de', 'fr', or 'es'

// Get translation string
t('streams.title') // Uses current language
t('streams.title', 'ja') // Force specific language

// Set language and update UI
setLanguage('ja')

// Initialize localization (call on page load)
initLocalization()

// Get translation string
getBrowserLanguage() // Returns browser's language code
```

## Add to Other Pages

1. **Add scripts to `<head>`:**
```html
<script src="/js/translations.js"></script>
<script src="/js/localization.js"></script>
```

2. **Mark translatable elements with `data-i18n`:**
```html
<h1 data-i18n="page.title">My Title</h1>
<button data-i18n="button.submit">Submit</button>
```

3. **Initialize at end of `<body>`:**
```javascript
<script>
  initLocalization();
  // ... rest of your page code
</script>
```

## Supported Languages

| Code | Language | Flag |
|------|----------|------|
| `en` | English | 🇬🇧 |
| `ja` | 日本語 (Japanese) | 🇯🇵 |
| `de` | Deutsch (German) | 🇩🇪 |
| `fr` | Français (French) | 🇫🇷 |
| `es` | Español (Spanish) | 🇪🇸 |

## Add New Language

1. Add language to `SUPPORTED_LANGUAGES` in [public/js/localization.js](public/js/localization.js):
```javascript
const SUPPORTED_LANGUAGES = ['en', 'ja', 'de', 'fr', 'es', 'zh']; // Add 'zh'
```

2. Add translations in [public/js/translations.js](public/js/translations.js):
```javascript
zh: {
  'streams.title': '流管理',
  'stream.viewers': '观众',
  // ... etc
}
```

3. Add to language selector HTML:
```html
<option value="zh">🇨🇳 中文</option>
```

## Browser Support

Works in all modern browsers:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers

## Performance

- **No additional HTTP requests** for language detection
- **No API calls** on every page load (uses cookies)
- **~5KB** for translations file
- **~2KB** for localization logic
- **Instant language switching** (no page reload needed)

## Cookie Details

**Cookie Name:** `taucho_language`
**Duration:** 365 days
**Value:** Language code ('en', 'ja', etc.)
**Security:** SameSite=Lax (protects against CSRF)

## Testing

### Test Browser Language Detection
```bash
# Open DevTools Console
console.log(navigator.language) // Shows browser language
console.log(getBrowserLanguage()) // Shows detected supported language
```

### Test Language Switching
```javascript
// In DevTools Console
setLanguage('ja') // Switch to Japanese
setLanguage('en') // Switch to English
getCurrentLanguage() // Check current language
```

### Check Cookie
```javascript
// In DevTools Console
getCookie('taucho_language') // Shows saved preference
```

## Notes

- Language preference is **device-specific** (stored in browser cookie)
- Optional API sync makes it **cross-device** if user is authenticated
- Fallback chain: Cookie → Browser Language → English (default)
- If translation key is missing, falls back to English version
- All alerts/confirmations respect current language via `t()` function

/**
 * Localization Management for TauchoPortal
 * - Detects browser language
 * - Manages language preferences via cookies
 * - Optionally syncs to API if user is authenticated
 */

const SUPPORTED_LANGUAGES = ['en', 'ja', 'de', 'fr', 'es'];
const LANGUAGE_COOKIE_NAME = 'taucho_language';
const LANGUAGE_COOKIE_EXPIRY_DAYS = 365;

/**
 * Get the current language from cookie or default
 */
function getCurrentLanguage() {
  // 1. Check cookie first
  const cookieLang = getCookie(LANGUAGE_COOKIE_NAME);
  if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang)) {
    return cookieLang;
  }

  // 2. Try browser language
  const browserLang = getBrowserLanguage();
  if (browserLang) {
    setCookie(LANGUAGE_COOKIE_NAME, browserLang, LANGUAGE_COOKIE_EXPIRY_DAYS);
    return browserLang;
  }

  // 3. Default to English
  setCookie(LANGUAGE_COOKIE_NAME, 'en', LANGUAGE_COOKIE_EXPIRY_DAYS);
  return 'en';
}

/**
 * Get browser language, mapped to supported languages
 */
function getBrowserLanguage() {
  // Get browser language (e.g., 'en-US' -> 'en')
  const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0].toLowerCase();

  // Check if we support this language
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }

  return null;
}

/**
 * Set the language and update UI
 * @param {string} lang - Language code ('en', 'ja', 'de', 'fr', 'es')
 */
function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.error(`Language ${lang} not supported`);
    return;
  }

  // Save to cookie
  setCookie(LANGUAGE_COOKIE_NAME, lang, LANGUAGE_COOKIE_EXPIRY_DAYS);

  // Update all translatable elements
  updatePageTranslations(lang);

  // Update page direction for RTL languages (future support)
  document.documentElement.lang = lang;

  // If user is authenticated, sync to API (optional)
  syncLanguagePreferenceToAPI(lang);
}

/**
 * Update all UI text elements with new language
 */
function updatePageTranslations(lang) {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key, lang);
  });

  // Update all attributes with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key, lang);
  });

  // Trigger custom language change event for special handling
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

/**
 * Sync language preference to API (if user is authenticated)
 * This stores preference in user profile for cross-device sync
 */
async function syncLanguagePreferenceToAPI(lang) {
  try {
    // Only sync if user is authenticated
    const user = await getUserProfile();
    if (!user) {
      console.log('Not authenticated, skipping API sync');
      return;
    }

    // Send preference to API
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ language: lang }),
    });

    if (!response.ok) {
      console.warn('Failed to sync language preference to API');
    }
  } catch (error) {
    // Silently fail - cookie is already set, so functionality continues
    console.debug('Language API sync skipped:', error.message);
  }
}

/**
 * Cookie helpers
 */
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Load and cache user language preference from API (if authenticated)
 * Call this on page load
 */
async function loadUserLanguagePreference() {
  try {
    const user = await getUserProfile();
    if (!user) {
      return; // Not authenticated, use cookie/browser default
    }

    // Fetch user preferences from API
    const response = await fetch('/api/user/preferences', {
      credentials: 'include',
    });

    if (response.ok) {
      const preferences = await response.json();
      if (preferences.language && SUPPORTED_LANGUAGES.includes(preferences.language)) {
        // Update cookie to match API preference
        setCookie(LANGUAGE_COOKIE_NAME, preferences.language, LANGUAGE_COOKIE_EXPIRY_DAYS);
        setLanguage(preferences.language);
        return;
      }
    }
  } catch (error) {
    console.debug('Could not load user language preference:', error.message);
  }

  // Fallback to cookie or browser default
  const currentLang = getCurrentLanguage();
  updatePageTranslations(currentLang);
}

/**
 * Create a language selector dropdown (optional)
 * Add this to your navbar/header
 */
function createLanguageSelector() {
  const selector = document.createElement('select');
  selector.id = 'language-selector';
  selector.className = 'language-selector';
  selector.value = getCurrentLanguage();

  const languages = {
    en: '🇬🇧 English',
    ja: '🇯🇵 日本語',
    de: '🇩🇪 Deutsch',
    fr: '🇫🇷 Français',
    es: '🇪🇸 Español',
  };

  for (const [code, label] of Object.entries(languages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    selector.appendChild(option);
  }

  selector.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  return selector;
}

/**
 * Initialize localization on page load
 * Call this at the start of your HTML <script>
 */
function initLocalization() {
  // Try to load user preference if authenticated, otherwise use cookie/browser default
  loadUserLanguagePreference();
}

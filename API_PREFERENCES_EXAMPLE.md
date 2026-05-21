/**
 * Example API Implementation for Language Preferences
 * This is pseudo-code showing what your API server should implement
 * to support cross-device language persistence
 */

// ============================================================
// Go / Backend Example (for your API server)
// ============================================================

/*
package api

import (
    "database/sql"
    "encoding/json"
    "net/http"
)

// UserPreferences represents user's UI preferences
type UserPreferences struct {
    UserID   int    `json:"user_id"`
    Language string `json:"language"` // 'en', 'ja', 'de', 'fr', 'es'
    Theme    string `json:"theme,omitempty"` // Optional: 'light', 'dark'
    UpdatedAt string `json:"updated_at"`
}

// GetUserPreferences retrieves user's saved preferences
// GET /api/user/preferences
func GetUserPreferences(w http.ResponseWriter, r *http.Request) {
    // Get user ID from authenticated session
    userID := getAuthenticatedUserID(r)
    if userID == 0 {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
        return
    }

    // Query from database
    var prefs UserPreferences
    err := db.QueryRow(
        "SELECT user_id, language, theme, updated_at FROM user_preferences WHERE user_id = ?",
        userID,
    ).Scan(&prefs.UserID, &prefs.Language, &prefs.Theme, &prefs.UpdatedAt)

    if err == sql.ErrNoRows {
        // Return default preferences
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(UserPreferences{
            UserID:   userID,
            Language: "en",
            Theme:    "light",
        })
        return
    }

    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "database error"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(prefs)
}

// UpdateUserPreferences updates user's preferences
// POST /api/user/preferences
func UpdateUserPreferences(w http.ResponseWriter, r *http.Request) {
    // Get user ID from authenticated session
    userID := getAuthenticatedUserID(r)
    if userID == 0 {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
        return
    }

    // Parse request body
    var req UserPreferences
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
        return
    }

    // Validate language
    validLanguages := map[string]bool{"en": true, "ja": true, "de": true, "fr": true, "es": true}
    if !validLanguages[req.Language] {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid language"})
        return
    }

    // Update database (INSERT or UPDATE)
    _, err := db.Exec(
        `INSERT INTO user_preferences (user_id, language, theme, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
         language = VALUES(language),
         theme = COALESCE(VALUES(theme), theme),
         updated_at = NOW()`,
        userID, req.Language, req.Theme,
    )

    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "database error"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(UserPreferences{
        UserID:    userID,
        Language:  req.Language,
        Theme:     req.Theme,
        UpdatedAt: "now",
    })
}

// Database Schema (SQL)
/*
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'ja', 'de', 'fr', 'es'
    theme VARCHAR(20),                  -- 'light', 'dark' (optional)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
*/
*/

// ============================================================
// JavaScript Frontend (already implemented)
// ============================================================

/**
 * The frontend already handles:
 * 
 * 1. On page load:
 *    - Check cookie for saved language
 *    - If authenticated, fetch /api/user/preferences
 *    - Sync server preference to local cookie
 * 
 * 2. On language change:
 *    - Save to cookie immediately (instant)
 *    - If authenticated, POST to /api/user/preferences in background
 * 
 * See localization.js for implementation
 */

// ============================================================
// Usage Example
// ============================================================

/**
 * When user visits page:
 * 
 * Browser: 
 *   1. loadUserLanguagePreference() called
 *   2. Checks cookie: "taucho_language=en"
 *   3. User is authenticated (getUserProfile() returns user)
 *   4. Fetches GET /api/user/preferences
 *   5. Server returns: {language: "ja"}
 *   6. Frontend updates cookie: "taucho_language=ja"
 *   7. UI switches to Japanese
 * 
 * When user changes language:
 *   1. User selects "Español" in dropdown
 *   2. setLanguage('es') called
 *   3. Cookie saved immediately: "taucho_language=es"
 *   4. UI updates instantly to Spanish
 *   5. In background, syncLanguagePreferenceToAPI('es') called
 *   6. POSTs to /api/user/preferences with {language: "es"}
 *   7. Server updates database
 *   8. Next device visit, preference is synced again
 */

// ============================================================
// Optional: Extend with More Preferences
// ============================================================

/**
 * You can extend this to support more UI preferences:
 * 
 * {
 *   "language": "ja",
 *   "theme": "dark",
 *   "timezone": "Asia/Tokyo",
 *   "notifications": true,
 *   "compactMode": false
 * }
 * 
 * Just:
 * 1. Add fields to UserPreferences struct
 * 2. Add columns to user_preferences table
 * 3. Update frontend to send/receive in POST
 * 4. Update HTML to have data-i18n attributes
 */

// ============================================================
// Testing
// ============================================================

/**
 * Test with cURL:
 * 
 * # GET preferences (requires auth cookie)
 * curl -H "Cookie: session=your_session_id" \
 *   http://localhost:8081/api/user/preferences
 * 
 * # POST/UPDATE preferences
 * curl -X POST \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: session=your_session_id" \
 *   -d '{"language":"ja"}' \
 *   http://localhost:8081/api/user/preferences
 */

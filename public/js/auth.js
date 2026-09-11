/**
 * Authentication helpers - all API calls go through the /api proxy to the API server
 */

const API_BASE = '/api';

// Cache the user profile to avoid duplicate network calls per page load
let _cachedUser = undefined;

/**
 * Get the current user's profile. Returns null if not authenticated.
 * Result is cached for the lifetime of the page.
 */
async function getUserProfile() {
    if (_cachedUser !== undefined) return _cachedUser;
    if (Object.prototype.hasOwnProperty.call(window, '__user')) {
        _cachedUser = window.__user || null;
        return _cachedUser;
    }
    try {
        const response = await fetch(`${API_BASE}/auth/user`, {
            credentials: 'include'
        });
        _cachedUser = response.ok ? await response.json() : null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        _cachedUser = null;
    }
    return _cachedUser;
}

/**
 * Returns true if the user has a valid session.
 */
async function isUserAuthenticated() {
    return (await getUserProfile()) !== null;
}

/**
 * Redirect to login if not authenticated. Returns false if redirecting.
 */
async function requireAuth() {
    const user = await getUserProfile();
    if (!user) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

/**
 * Start Google OAuth login: fetches the auth URL from the API then redirects.
 */
async function startOAuthLogin(provider = 'google') {
    try {
        // Set the return URL so after OAuth callback, we redirect to dashboard instead of login
        await fetch('/set-oauth-return?url=/dashboard', {
            method: 'GET',
            credentials: 'include'
        }).catch(e => console.error('Failed to set oauth_return:', e));
        
        const response = await fetch(`${API_BASE}/oauth/login?provider=${encodeURIComponent(provider)}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            alert(window._i18nAuthMsg?.['auth.loginFailed'] || 'Failed to start login. Please try again.');
            return;
        }
        const data = await response.json();
        if (data.auth_url) {
            window.location.href = data.auth_url;
        } else {
            alert(window._i18nAuthMsg?.['auth.configError'] || 'Login configuration error. Please try again.');
        }
    } catch (error) {
        console.error('Error starting OAuth login:', error);
        alert((window._i18nAuthMsg?.['auth.error'] || 'Login error') + ': ' + error.message);
    }
}

/**
 * Log out by clearing the session on the API, then redirect home.
 */
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        // proceed with redirect even if the request fails
    }
    _cachedUser = null;
    window.location.href = '/login';
}

/**
 * Update elements tagged with data-auth="authenticated" or data-auth="unauthenticated".
 * Also populates #user-display if present.
 */
async function updateAuthUI() {
    const user = await getUserProfile();
    const isAuth = user !== null;

    document.querySelectorAll('[data-auth="authenticated"]').forEach(el => {
        el.style.display = isAuth ? 'block' : 'none';
    });
    document.querySelectorAll('[data-auth="unauthenticated"]').forEach(el => {
        el.style.display = isAuth ? 'none' : 'block';
    });

    if (isAuth) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.textContent = user.email || user.username || 'User';
        }
    }
}

document.addEventListener('DOMContentLoaded', updateAuthUI);

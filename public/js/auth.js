/**
 * Authentication helpers for the UI
 * These functions handle OAuth flows and session management
 */

/**
 * Check if user is authenticated by checking for session cookie
 */
async function isUserAuthenticated() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'include' // Include cookies
        });
        const data = await response.json();
        return data.authenticated === true;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}

/**
 * Get the current user's profile
 */
async function getUserProfile() {
    try {
        const response = await fetch('/api/auth/user', {
            method: 'GET',
            credentials: 'include' // Include cookies
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

/**
 * Start OAuth login flow
 * This calls the backend UI to get the OAuth login URL,
 * then redirects the browser to it
 */
async function startOAuthLogin(provider = 'google') {
    try {
        const response = await fetch(`/api/oauth/login?provider=${encodeURIComponent(provider)}`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            console.error('Failed to get OAuth login URL');
            alert('Failed to start login. Please try again.');
            return;
        }
        
        const data = await response.json();
        if (data.auth_url) {
            // Redirect to OAuth provider (Google, etc)
            window.location.href = data.auth_url;
        } else {
            console.error('No auth_url in response:', data);
            alert('Login configuration error. Please try again.');
        }
    } catch (error) {
        console.error('Error starting OAuth login:', error);
        alert('Login error: ' + error.message);
    }
}

/**
 * Redirect to login page if not authenticated
 */
async function requireAuth() {
    const isAuth = await isUserAuthenticated();
    if (!isAuth) {
        // Redirect to login page
        window.location.href = '/login';
    }
    return isAuth;
}

/**
 * Utility: Show/hide elements based on auth status
 */
async function updateAuthUI() {
    const isAuth = await isUserAuthenticated();
    
    // Show/hide auth elements
    const authElements = document.querySelectorAll('[data-auth="authenticated"]');
    const unauthElements = document.querySelectorAll('[data-auth="unauthenticated"]');
    
    authElements.forEach(el => {
        el.style.display = isAuth ? 'block' : 'none';
    });
    
    unauthElements.forEach(el => {
        el.style.display = isAuth ? 'none' : 'block';
    });
    
    // If authenticated, show user info
    if (isAuth) {
        const user = await getUserProfile();
        if (user) {
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.textContent = user.email || user.username || 'User';
            }
        }
    }
}

// Run updateAuthUI when page loads
document.addEventListener('DOMContentLoaded', updateAuthUI);

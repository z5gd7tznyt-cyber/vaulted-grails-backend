// ============================================================
// AUTHENTICATION UTILITIES - USE ON EVERY PAGE
// ============================================================
// Add this to a <script> tag at the top of each page

const API_BASE = 'https://vaulted-grails-backend-production.up.railway.app';

// Check if user is authenticated (validates with backend)
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    // No token = definitely not logged in
    if (!token) {
        return { isAuthenticated: false, user: null };
    }
    
    try {
        // Validate token with backend
        const res = await fetch(`${API_BASE}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            // Token is invalid or expired
            localStorage.clear();
            return { isAuthenticated: false, user: null };
        }
        
        const user = await res.json();
        return { isAuthenticated: true, user };
        
    } catch (error) {
        console.error('Auth check error:', error);
        return { isAuthenticated: false, user: null };
    }
}

// Require authentication (redirects to login if not authenticated)
async function requireAuth(redirectBack = true) {
    const { isAuthenticated, user } = await checkAuth();
    
    if (!isAuthenticated) {
        // Save current page so we can come back after login
        if (redirectBack) {
            const currentPage = window.location.pathname + window.location.search;
            localStorage.setItem('redirectAfterLogin', currentPage);
        }
        
        // Redirect to login
        window.location.href = 'login.html';
        return null;
    }
    
    return user;
}

// Optional auth (shows different content if logged in vs not)
async function optionalAuth() {
    const { isAuthenticated, user } = await checkAuth();
    return { isAuthenticated, user };
}

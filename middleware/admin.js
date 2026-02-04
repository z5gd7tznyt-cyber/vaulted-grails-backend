// ============================================================
// ADMIN MIDDLEWARE
// ============================================================
// This protects routes that require admin privileges
// Use AFTER authenticate middleware
// ============================================================

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
    // Must be used after authenticate middleware
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
        return res.status(403).json({ 
            error: 'Admin access required. This action is forbidden.' 
        });
    }
    
    next();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    requireAdmin
};

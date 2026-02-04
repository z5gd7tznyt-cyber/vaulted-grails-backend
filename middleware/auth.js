// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// This protects routes that require login
// ============================================================

const jwt = require('jsonwebtoken');
const { findById } = require('../utils/supabase');

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No token provided. Please login.' 
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await findById('users', decoded.userId);
        
        if (!user) {
            return res.status(401).json({ 
                error: 'User not found. Please login again.' 
            });
        }
        
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            ticketBalance: user.ticket_balance,
            subscriptionStatus: user.subscription_status,
            isAdmin: user.email === process.env.ADMIN_EMAIL
        };
        
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token. Please login again.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired. Please login again.' 
            });
        }
        
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            error: 'Authentication failed.' 
        });
    }
}

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for routes that work both logged in and logged out
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findById('users', decoded.userId);
        
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                ticketBalance: user.ticket_balance,
                subscriptionStatus: user.subscription_status,
                isAdmin: user.email === process.env.ADMIN_EMAIL
            };
        } else {
            req.user = null;
        }
        
        next();
        
    } catch (error) {
        // If token is invalid, just treat as not logged in
        req.user = null;
        next();
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    authenticate,
    optionalAuth
};

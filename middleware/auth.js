const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Authenticate middleware
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Extract token (format: "Bearer TOKEN")
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // CRITICAL: Set user on request object
    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    console.log('✅ Authenticated user:', req.user.id, req.user.email);
    
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };

const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please login.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'User not found. Please login again.' });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      ticketBalance: user.ticket_balance,
      subscriptionStatus: user.subscription_status,
      isPremium: user.subscription_status === 'premium'
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

module.exports = { authenticate };

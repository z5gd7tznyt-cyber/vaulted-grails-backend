// ============================================================
// SERVER.JS CHECK - MAKE SURE AUTH ROUTES ARE MOUNTED
// ============================================================

// Your server.js should have this line:
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ============================================================
// FULL EXAMPLE SERVER.JS WITH ALL ROUTES:
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://vaultgrails.com',
      'https://www.vaultgrails.com',
      'https://vaulted-grails.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000'
    ];
    
    if (!origin) return callback(null, true);
    
    if (origin && origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ✅ CRITICAL: Stripe webhook needs RAW body BEFORE express.json()
app.post('/api/payments/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./routes/payments')
);

// NOW parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================
// ✅ MOUNT ALL ROUTES - MAKE SURE AUTH IS INCLUDED!
// ============================================================
const authRoutes = require('./routes/auth');         // ← CRITICAL!
const rafflesRoutes = require('./routes/raffles');
const userRoutes = require('./routes/user');
const adsRoutes = require('./routes/ads');
const ticketsRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

app.use('/api/auth', authRoutes);                    // ← MUST BE HERE!
app.use('/api/raffles', rafflesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

console.log('✅ All routes mounted successfully');

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((req, res) => {
  console.log('❌ 404 - Endpoint not found:', req.method, req.path);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error'
  });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║   VAULTED GRAILS BACKEND - RUNNING       ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}   ║
║   Health Check: /api/health              ║
║                                          ║
║   ROUTES MOUNTED:                        ║
║   ✅ /api/auth (signup, login, verify)   ║
║   ✅ /api/raffles                         ║
║   ✅ /api/user                            ║
║   ✅ /api/ads                             ║
║   ✅ /api/tickets                         ║
║   ✅ /api/admin                           ║
║   ✅ /api/payments                        ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;

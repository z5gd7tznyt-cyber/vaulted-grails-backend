// ============================================================
// VAULTED GRAILS BACKEND - MAIN SERVER FILE
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Trust Railway proxy
app.set('trust proxy', true);

// Rate limiting (prevent abuse)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// ============================================================
// ROUTES
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// Authentication routes (signup/login)
app.use('/api/auth', require('./routes/auth'));

// Raffle routes (browse/enter raffles)
app.use('/api/raffles', require('./routes/raffles'));

// Ticket routes (buy/use tickets)
app.use('/api/tickets', require('./routes/tickets'));

// User routes (profile/settings)
app.use('/api/user', require('./routes/user'));

// Admin routes (manage raffles/users)
app.use('/api/admin', require('./routes/admin'));

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
    ║   Environment: ${process.env.NODE_ENV}   ║
    ║   Health Check: /api/health              ║
    ╚══════════════════════════════════════════╝
    `);
});

module.exports = app;

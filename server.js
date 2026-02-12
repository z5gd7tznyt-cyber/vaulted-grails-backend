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
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://vaultgrails.com',
            'https://www.vaultgrails.com',
            'https://vaulted-grails.vercel.app',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5000'
        ];
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // IMPORTANT: Allow ALL Vercel preview deployments
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

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust Railway proxy
app.set('trust proxy', 1);

// Rate limiting (prevent abuse)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
});
app.use('/api/', limiter);

// ============================================================
// IMPORT ROUTES
// ============================================================
const authRoutes = require('./routes/auth');
const rafflesRoutes = require('./routes/raffles');
const ticketsRoutes = require('./routes/tickets');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// ============================================================
// HEALTH CHECK (before route mounting)
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// ============================================================
// MOUNT ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/raffles', rafflesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

console.log('✅ All routes mounted successfully');

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

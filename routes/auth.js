// ============================================================
// AUTHENTICATION ROUTES
// ============================================================
// POST /api/auth/register - Create new account
// POST /api/auth/login - Login to existing account
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, exists } = require('../utils/supabase');

// ============================================================
// REGISTER NEW USER
// ============================================================

router.post('/register', [
    // Validation rules
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('dateOfBirth').isISO8601().toDate()
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: errors.array()
            });
        }
        
        const { email, password, firstName, lastName, dateOfBirth } = req.body;
        
        // Check if user already exists
        const userExists = await exists('users', { email });
        if (userExists) {
            return res.status(409).json({ 
                error: 'Email already registered' 
            });
        }
        
        // Check age (must be 18+)
        const age = Math.floor((new Date() - new Date(dateOfBirth)) / 31557600000);
        if (age < 18) {
            return res.status(400).json({ 
                error: 'Must be 18 or older to register' 
            });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: passwordHash,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                ticket_balance: 0,
                subscription_status: 'free'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        
        // Return user data (without password)
        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                ticketBalance: user.ticket_balance,
                subscriptionStatus: user.subscription_status
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Failed to create account' 
        });
    }
});

// ============================================================
// LOGIN EXISTING USER
// ============================================================

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: errors.array()
            });
        }
        
        const { email, password } = req.body;
        
        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }
        
        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        
        // Return user data (without password)
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                ticketBalance: user.ticket_balance,
                subscriptionStatus: user.subscription_status
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed' 
        });
    }
});

module.exports = router;

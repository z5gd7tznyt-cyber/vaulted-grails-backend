// ============================================================
// AUTHENTICATION ROUTES
// ============================================================
// POST /api/auth/register - Create new account
// POST /api/auth/login - Login to existing account
// POST /api/auth/check-username - Check if username is available
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, exists } = require('../utils/supabase');

// ============================================================
// CHECK USERNAME AVAILABILITY
// ============================================================

router.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        
        // Validate username format
        if (!username || typeof username !== 'string') {
            return res.json({ 
                available: false, 
                error: 'Username is required' 
            });
        }
        
        const trimmedUsername = username.trim().toLowerCase();
        
        // Check length
        if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
            return res.json({ 
                available: false, 
                error: 'Username must be 3-20 characters' 
            });
        }
        
        // Check format (letters, numbers, underscores only)
        if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
            return res.json({ 
                available: false, 
                error: 'Username can only contain letters, numbers, and underscores' 
            });
        }
        
        // Check if username is taken
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .ilike('username', trimmedUsername)
            .maybeSingle();
        
        if (error) {
            console.error('Error checking username:', error);
            throw error;
        }
        
        // If data exists, username is taken
        const available = !data;
        
        res.json({ 
            available,
            username: trimmedUsername 
        });
        
    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({ 
            available: false,
            error: 'Failed to check username availability' 
        });
    }
});

// ============================================================
// REGISTER NEW USER
// ============================================================

router.post('/register', [
    // Validation rules
    body('username').trim().isLength({ min: 3, max: 20 }),
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
        
        const { username, email, password, firstName, lastName, dateOfBirth } = req.body;
        
        const trimmedUsername = username.trim().toLowerCase();
        
        // Validate username format
        if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
            return res.status(400).json({ 
                error: 'Username can only contain letters, numbers, and underscores' 
            });
        }
        
        // Check if username is taken
        const usernameExists = await exists('users', { username: trimmedUsername });
        if (usernameExists) {
            return res.status(409).json({ 
                error: 'Username already taken' 
            });
        }
        
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
                username: trimmedUsername,
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
                username: user.username,
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
                username: user.username,
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
// Add signup alias for frontend compatibility
router.post('/signup', [
    body('username').optional().trim().isLength({ min: 3, max: 20 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('dateOfBirth').optional().isISO8601().toDate()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: errors.array()
            });
        }
        
        const { username, email, password, firstName, lastName, dateOfBirth } = req.body;
        
        // Generate username from email if not provided
        const finalUsername = username ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase();
        
        // Validate username format
        if (!/^[a-z0-9_]+$/.test(finalUsername)) {
            return res.status(400).json({ 
                error: 'Username can only contain letters, numbers, and underscores' 
            });
        }
        
        // Check if username is taken
        const usernameExists = await exists('users', { username: finalUsername });
        if (usernameExists) {
            return res.status(409).json({ 
                error: 'Username already taken' 
            });
        }
        
        // Check if email already registered
        const userExists = await exists('users', { email });
        if (userExists) {
            return res.status(409).json({ 
                error: 'Email already registered' 
            });
        }
        
        // Check age if provided (must be 18+)
        if (dateOfBirth) {
            const age = Math.floor((new Date() - new Date(dateOfBirth)) / 31557600000);
            if (age < 18) {
                return res.status(400).json({ 
                    error: 'Must be 18 or older to register' 
                });
            }
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                username: finalUsername,
                email,
                password_hash: passwordHash,
                first_name: firstName || null,
                last_name: lastName || null,
                date_of_birth: dateOfBirth || null,
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
        
        // Return user data (frontend compatible format)
        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                tickets: user.ticket_balance, // Frontend expects "tickets"
                isPremium: user.subscription_status === 'premium',
                subscriptionStatus: user.subscription_status
            }
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            error: 'Failed to create account' 
        });
    }
});
module.exports = router;

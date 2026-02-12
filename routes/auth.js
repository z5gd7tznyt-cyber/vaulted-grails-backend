const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, exists } = require('../utils/supabase');

// POST /api/auth/signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }
    
    const { email, username, password, firstName, lastName, dateOfBirth } = req.body;
    
    const finalUsername = username ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase();
    
    // Check if email already exists
    const emailExists = await exists('users', { email });
    if (emailExists) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Check if username already exists
    const usernameExists = await exists('users', { username: finalUsername });
    if (usernameExists) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        username: finalUsername,
        email,
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        date_of_birth: dateOfBirth || null,
        ticket_balance: 0,
        subscription_status: 'free'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tickets: user.ticket_balance,
        isPremium: user.subscription_status === 'premium'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user by email or username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},username.eq.${email}`)
      .maybeSingle();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tickets: user.ticket_balance,
        isPremium: user.subscription_status === 'premium'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

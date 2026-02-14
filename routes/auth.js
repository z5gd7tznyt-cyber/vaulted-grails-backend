const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, first_name, last_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    console.log('📝 Signup attempt:', email);

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      console.log('❌ Email already exists');
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - NO TICKETS, NO PREMIUM!
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash: hashedPassword, // ✅ CORRECT COLUMN NAME
        username: username || email.split('@')[0],
        first_name: first_name || null,
        last_name: last_name || null,
        subscription_status: 'free'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }

    console.log('✅ User created:', user.id, user.email);

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        subscription_status: 'free'
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    // Get user - SELECT password_hash!
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, subscription_status, password_hash') // ✅ CORRECT COLUMN
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.email);

    // Check if password_hash exists
    if (!user.password_hash) {
      console.error('❌ No password hash in database for user:', user.email);
      return res.status(500).json({ error: 'Account setup incomplete. Please contact support.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash); // ✅ CORRECT FIELD
    if (!validPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Login successful:', user.id, user.email);

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        subscription_status: user.subscription_status || 'free'
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

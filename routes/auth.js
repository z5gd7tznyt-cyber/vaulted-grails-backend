const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase } = require('../utils/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vaultgrails.com';

// ============================================================
// POST /api/auth/signup
// ============================================================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, first_name, last_name } = req.body;

    console.log('📝 Signup attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      console.log('❌ Email already exists');
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user - NOT VERIFIED YET
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        username: username || email.split('@')[0],
        first_name: first_name || null,
        last_name: last_name || null,
        subscription_status: 'free',
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: tokenExpires.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }

    console.log('✅ User created:', user.id, user.email);

    // Send verification email (using Resend or console log for now)
    const verificationLink = `${FRONTEND_URL}/verify-email.html?token=${verificationToken}`;
    
    console.log('📧 VERIFICATION EMAIL:');
    console.log('To:', email);
    console.log('Link:', verificationLink);
    console.log('(Set up Resend to actually send emails)');

    // TODO: Uncomment when Resend is set up
    // await sendVerificationEmail(email, verificationToken);

    // Create JWT (user can login but has limited access until verified)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        email_verified: false
      },
      verificationLink: verificationLink // For testing - remove in production
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, subscription_status, password_hash, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.email);

    // Check if password_hash exists
    if (!user.password_hash) {
      console.error('❌ No password hash for user:', user.email);
      return res.status(500).json({ error: 'Account error. Please contact support.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
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
        subscription_status: user.subscription_status || 'free',
        email_verified: user.email_verified || false
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================================
// GET /api/auth/verify-email?token=...
// ============================================================
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    console.log('📧 Email verification attempt with token:', token ? 'present' : 'missing');

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Find user with this token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (error || !user) {
      console.log('❌ Invalid token');
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('✅ Email already verified:', user.email);
      return res.json({ 
        success: true, 
        message: 'Email already verified!',
        alreadyVerified: true
      });
    }

    // Check if token expired
    if (new Date(user.verification_token_expires) < new Date()) {
      console.log('❌ Token expired');
      return res.status(400).json({ error: 'Verification link expired. Please request a new one.' });
    }

    // Verify email
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('✅ Email verified:', user.email);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now enter raffles.'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================================
// POST /api/auth/resend-verification
// ============================================================
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 Resend verification request:', email);

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If the email exists, verification link sent!' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.json({ success: true, message: 'Email already verified!' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user
    await supabase
      .from('users')
      .update({
        verification_token: verificationToken,
        verification_token_expires: tokenExpires.toISOString()
      })
      .eq('id', user.id);

    // Send email (log for now)
    const verificationLink = `${FRONTEND_URL}/verify-email.html?token=${verificationToken}`;
    console.log('📧 Resend verification to:', email);
    console.log('Link:', verificationLink);

    // TODO: Send actual email with Resend
    // await sendVerificationEmail(user.email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent! Check your inbox.',
      verificationLink: verificationLink // For testing - remove in production
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification' });
  }
});

module.exports = router;

// ============================================================
// USER ROUTES
// ============================================================
// GET /api/user/me - Get user profile
// PUT /api/user/me - Update user profile
// GET /api/user/entries - Get user's raffle entries
// GET /api/user/transactions - Get ticket transaction history
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// ============================================================
// GET USER PROFILE
// ============================================================

router.get('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email, first_name, last_name, date_of_birth, ticket_balance, subscription_status, created_at')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        res.json({ user });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            error: 'Failed to get profile' 
        });
    }
});

// ============================================================
// UPDATE USER PROFILE
// ============================================================

router.put('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName } = req.body;
        
        const updates = {};
        if (firstName) updates.first_name = firstName;
        if (lastName) updates.last_name = lastName;
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                error: 'No updates provided' 
            });
        }
        
        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            message: 'Profile updated',
            user
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            error: 'Failed to update profile' 
        });
    }
});

// ============================================================
// GET USER'S RAFFLE ENTRIES
// ============================================================

router.get('/entries', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: entries, error } = await supabase
            .from('raffle_entries')
            .select(`
                id,
                ticket_count,
                entered_at,
                raffles (
                    id,
                    title,
                    image_url,
                    value,
                    draw_date,
                    status
                )
            `)
            .eq('user_id', userId)
            .order('entered_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            count: entries.length,
            entries
        });
        
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ 
            error: 'Failed to get entries' 
        });
    }
});
// ============================================================
// GET ACTIVE ENTRIES (for dashboard)
// ============================================================

router.get('/entries/active', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: entries, error } = await supabase
            .from('raffle_entries')
            .select(`
                id,
                ticket_count,
                entered_at,
                raffles!inner (
                    id,
                    title,
                    image_url,
                    value,
                    draw_date,
                    status
                )
            `)
            .eq('user_id', userId)
            .eq('raffles.status', 'active')
            .order('entered_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            count: entries.length,
            entries
        });
        
    } catch (error) {
        console.error('Get active entries error:', error);
        res.status(500).json({ 
            error: 'Failed to get active entries' 
        });
    }
});

// ============================================================
// GET USER WINS (for dashboard)
// ============================================================

router.get('/wins', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Query raffle_entries where this user won
        const { data: wins, error } = await supabase
            .from('raffle_entries')
            .select(`
                id,
                ticket_count,
                entered_at,
                raffles (
                    id,
                    title,
                    image_url,
                    value,
                    draw_date,
                    winner_id
                )
            `)
            .eq('user_id', userId)
            .eq('raffles.winner_id', userId)
            .order('entered_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            count: wins.length,
            wins
        });
        
    } catch (error) {
        console.error('Get wins error:', error);
        res.status(500).json({ 
            error: 'Failed to get wins' 
        });
    }
});
// ============================================================
// GET TRANSACTION HISTORY
// ============================================================

router.get('/transactions', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;
        
        const { data: transactions, error } = await supabase
            .from('ticket_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));
        
        if (error) throw error;
        
        res.json({
            count: transactions.length,
            transactions
        });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            error: 'Failed to get transactions' 
        });
    }
});

module.exports = router;

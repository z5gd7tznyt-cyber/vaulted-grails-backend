const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/user/profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email, first_name, last_name, ticket_balance, subscription_status, created_at')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            tickets: user.ticket_balance,
            isPremium: user.subscription_status === 'premium',
            memberSince: user.created_at
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// GET /api/user/entries
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
                    value,
                    draw_date,
                    status
                )
            `)
            .eq('user_id', userId)
            .order('entered_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({ count: entries.length, entries });
    } catch (error) {
        console.error('Get entries error:', error);
        res.json({ count: 0, entries: [] });
    }
});

module.exports = router;

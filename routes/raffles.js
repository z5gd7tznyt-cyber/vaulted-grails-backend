// ============================================================
// RAFFLE ROUTES
// ============================================================
// GET /api/raffles/active - Get all active raffles
// GET /api/raffles/:id - Get single raffle details
// POST /api/raffles/:id/enter - Enter a raffle (requires auth)
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// ============================================================
// GET ALL ACTIVE RAFFLES
// ============================================================

router.get('/active', async (req, res) => {
    try {
        const { category, featured, limit = 100 } = req.query;
        
        let query = supabase
            .from('raffles')
            .select('*')
            .eq('status', 'active')
            .gt('draw_date', new Date().toISOString()) // Only future draws
            .order('draw_date', { ascending: true })
            .limit(parseInt(limit));
        
        // Filter by category if provided
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        
        // Filter by featured if requested
        if (featured === 'true') {
            query = query.eq('featured', true);
        }
        
        const { data: raffles, error } = await query;
        
        if (error) throw error;
        
        res.json({
            count: raffles.length,
            raffles
        });
        
    } catch (error) {
        console.error('Get raffles error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch raffles' 
        });
    }
});

// ============================================================
// GET SINGLE RAFFLE BY ID
// ============================================================

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: raffle, error } = await supabase
            .from('raffles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !raffle) {
            return res.status(404).json({ 
                error: 'Raffle not found' 
            });
        }
        
        res.json({ raffle });
        
    } catch (error) {
        console.error('Get raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch raffle' 
        });
    }
});

// ============================================================
// ENTER RAFFLE (requires authentication)
// ============================================================

router.post('/:id/enter', authenticate, async (req, res) => {
    try {
        const { id: raffleId } = req.params;
        const { ticketCount } = req.body;
        const userId = req.user.id;
        
        // Validate ticket count
        if (!ticketCount || ticketCount < 1) {
            return res.status(400).json({ 
                error: 'Invalid ticket count' 
            });
        }
        
        // Get raffle
        const { data: raffle, error: raffleError } = await supabase
            .from('raffles')
            .select('*')
            .eq('id', raffleId)
            .single();
        
        if (raffleError || !raffle) {
            return res.status(404).json({ 
                error: 'Raffle not found' 
            });
        }
        
        // Check raffle status
        if (raffle.status !== 'active') {
            return res.status(400).json({ 
                error: 'Raffle is not active' 
            });
        }
        
        // Check if draw date has passed
        if (new Date(raffle.draw_date) < new Date()) {
            return res.status(400).json({ 
                error: 'Raffle has ended' 
            });
        }
        
        // Check minimum tickets
        if (ticketCount < raffle.min_tickets) {
            return res.status(400).json({ 
                error: `Minimum ${raffle.min_tickets} tickets required` 
            });
        }
        
        // Get user's current balance
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('ticket_balance')
            .eq('id', userId)
            .single();
        
        if (userError || !user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }
        
        // Check if user has enough tickets
        if (user.ticket_balance < ticketCount) {
            return res.status(400).json({ 
                error: 'Insufficient ticket balance',
                required: ticketCount,
                available: user.ticket_balance
            });
        }
        
        // Create entry (triggers will auto-update totals and deduct tickets)
        const { data: entry, error: entryError } = await supabase
            .from('raffle_entries')
            .insert({
                user_id: userId,
                raffle_id: raffleId,
                ticket_count: ticketCount
            })
            .select()
            .single();
        
        if (entryError) throw entryError;
        
        // Get updated user balance
        const { data: updatedUser } = await supabase
            .from('users')
            .select('ticket_balance')
            .eq('id', userId)
            .single();
        
        res.json({
            message: 'Successfully entered raffle!',
            entry: {
                id: entry.id,
                ticketCount: entry.ticket_count,
                enteredAt: entry.entered_at
            },
            newBalance: updatedUser.ticket_balance
        });
        
    } catch (error) {
        console.error('Enter raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to enter raffle' 
        });
    }
});

module.exports = router;

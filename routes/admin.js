// ============================================================
// ADMIN ROUTES
// ============================================================
// POST /api/admin/raffles - Create new raffle
// PUT /api/admin/raffles/:id - Update raffle
// DELETE /api/admin/raffles/:id - Delete raffle
// POST /api/admin/raffles/:id/draw - Conduct raffle draw
// GET /api/admin/users - Get all users
// GET /api/admin/stats - Get platform statistics
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// All admin routes require authentication AND admin privileges
router.use(authenticate, requireAdmin);

// ============================================================
// CREATE NEW RAFFLE
// ============================================================

router.post('/raffles', async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            year,
            grade,
            value,
            imageUrl,
            featured,
            drawDate,
            minTickets
        } = req.body;
        
        // Validate required fields
        if (!title || !category || !value || !imageUrl || !drawDate) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }
        
        const { data: raffle, error } = await supabase
            .from('raffles')
            .insert({
                title,
                description,
                category,
                year,
                grade,
                value,
                image_url: imageUrl,
                featured: featured || false,
                draw_date: drawDate,
                min_tickets: minTickets || 1,
                status: 'active'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(201).json({
            message: 'Raffle created successfully',
            raffle
        });
        
    } catch (error) {
        console.error('Create raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to create raffle' 
        });
    }
});

// ============================================================
// UPDATE RAFFLE
// ============================================================

router.put('/raffles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.created_at;
        delete updates.total_entries;
        delete updates.winner_user_id;
        
        const { data: raffle, error } = await supabase
            .from('raffles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            message: 'Raffle updated successfully',
            raffle
        });
        
    } catch (error) {
        console.error('Update raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to update raffle' 
        });
    }
});

// ============================================================
// DELETE RAFFLE
// ============================================================

router.delete('/raffles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if raffle has entries
        const { data: entries, error: entriesError } = await supabase
            .from('raffle_entries')
            .select('id')
            .eq('raffle_id', id);
        
        if (entriesError) throw entriesError;
        
        if (entries.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete raffle with entries. Set status to "cancelled" instead.' 
            });
        }
        
        const { error } = await supabase
            .from('raffles')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        res.json({
            message: 'Raffle deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to delete raffle' 
        });
    }
});

// ============================================================
// CONDUCT RAFFLE DRAW
// ============================================================

router.post('/raffles/:id/draw', async (req, res) => {
    try {
        const { id: raffleId } = req.params;
        
        // Get all entries for this raffle
        const { data: entries, error: entriesError } = await supabase
            .from('raffle_entries')
            .select('user_id, ticket_count')
            .eq('raffle_id', raffleId);
        
        if (entriesError) throw entriesError;
        
        if (entries.length === 0) {
            return res.status(400).json({ 
                error: 'No entries for this raffle' 
            });
        }
        
        // Create weighted array (each ticket = one chance)
        const tickets = [];
        entries.forEach(entry => {
            for (let i = 0; i < entry.ticket_count; i++) {
                tickets.push(entry.user_id);
            }
        });
        
        // Select random winner
        const winnerUserId = tickets[Math.floor(Math.random() * tickets.length)];
        
        // Update raffle with winner
        const { data: raffle, error: updateError } = await supabase
            .from('raffles')
            .update({
                winner_user_id: winnerUserId,
                winner_selected_at: new Date().toISOString(),
                status: 'completed'
            })
            .eq('id', raffleId)
            .select()
            .single();
        
        if (updateError) throw updateError;
        
        // Get winner details
        const { data: winner } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', winnerUserId)
            .single();
        
        res.json({
            message: 'Draw completed successfully',
            raffle,
            winner
        });
        
    } catch (error) {
        console.error('Draw raffle error:', error);
        res.status(500).json({ 
            error: 'Failed to conduct draw' 
        });
    }
});

// ============================================================
// GET ALL USERS
// ============================================================

router.get('/users', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, ticket_balance, subscription_status, created_at')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        
        res.json({
            count: users.length,
            users
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            error: 'Failed to get users' 
        });
    }
});

// ============================================================
// GET PLATFORM STATISTICS
// ============================================================

router.get('/stats', async (req, res) => {
    try {
        // Get total users
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        // Get active raffles
        const { count: activeRaffles } = await supabase
            .from('raffles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        // Get total entries
        const { count: totalEntries } = await supabase
            .from('raffle_entries')
            .select('*', { count: 'exact', head: true });
        
        // Get premium subscribers
        const { count: premiumUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'premium');
        
        res.json({
            totalUsers,
            activeRaffles,
            totalEntries,
            premiumUsers
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get statistics' 
        });
    }
});

module.exports = router;

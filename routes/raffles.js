// ============================================================
// RAFFLE ROUTES - FRONTEND COMPATIBLE
// ============================================================
// GET /api/raffles - Get all raffles (supports ?status=live|active)
// GET /api/raffles/active - Get active raffles (alias)
// GET /api/raffles/:id - Get single raffle details
// POST /api/raffles/:id/enter - Enter a raffle (requires auth)
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// Helper function to calculate time remaining
function calculateTimeRemaining(drawDate) {
    const now = new Date();
    const end = new Date(drawDate);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
}

// Helper function to get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        basketball: '🏀',
        pokemon: '🔥',
        onepiece: '⚓',
        baseball: '⚾',
        football: '🏈',
        hockey: '🏒'
    };
    return emojis[category] || '🏆';
}

// ============================================================
// GET ALL RAFFLES (frontend compatible)
// ============================================================

const getRaffles = async (req, res) => {
    try {
        const { status = 'active', category, featured, limit = 100 } = req.query;
        
        // Support both "live" (frontend) and "active" (backend)
        const raffleStatus = status === 'live' ? 'active' : status;
        
        let query = supabase
            .from('raffles')
            .select('*')
            .eq('status', raffleStatus)
            .gt('draw_date', new Date().toISOString())
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
        
        // Format for frontend compatibility
        const formattedRaffles = raffles.map(raffle => ({
            id: raffle.id,
            title: raffle.title,
            description: raffle.description,
            value: raffle.value,
            emoji: getCategoryEmoji(raffle.category),
            grade: raffle.grade,
            cert_number: raffle.cert_number || null,
            year: raffle.year,
            category: raffle.category,
            bg_gradient: raffle.bg_gradient || 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(238,49,36,0.1))',
            total_tickets: raffle.total_entries || 0,
            total_entries: raffle.total_entries || 0,
            status: raffle.status,
            end_date: raffle.draw_date,
            draw_date: raffle.draw_date,
            time_remaining: calculateTimeRemaining(raffle.draw_date),
            image_url: raffle.image_url,
            featured: raffle.featured
        }));
        
        res.json(formattedRaffles);
        
    } catch (error) {
        console.error('Get raffles error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch raffles' 
        });
    }
};

// Support both endpoints
router

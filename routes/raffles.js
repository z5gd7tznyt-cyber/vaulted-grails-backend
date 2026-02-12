const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// Helper functions
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

// GET all raffles - supports both /api/raffles?status=live and /api/raffles/active
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
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    
    const { data: raffles, error } = await query;
    
    if (error) throw error;
    
    // Format for frontend
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
      featured: raffle.featured,
      min_tickets: raffle.min_tickets || 1,
      max_tickets: raffle.max_tickets
    }));
    
    res.json(formattedRaffles);
  } catch (error) {
    console.error('Get raffles error:', error);
    res.status(500).json({ error: 'Failed to fetch raffles' });
  }
};

// Mount both endpoints
router.get('/', getRaffles);
router.get('/active', getRaffles);

// GET single raffle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: raffle, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !raffle) {
      return res.status(404).json({ error: 'Raffle not found' });
    }
    
    res.json({
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
      featured: raffle.featured,
      min_tickets: raffle.min_tickets || 1,
      max_tickets: raffle.max_tickets
    });
  } catch (error) {
    console.error('Get raffle error:', error);
    res.status(500).json({ error: 'Failed to fetch raffle' });
  }
});

// POST enter raffle
router.post('/:id/enter', authenticate, async (req, res) => {
  try {
    const { id: raffleId } = req.params;
    const { tickets, ticketCount } = req.body;
    const userId = req.user.id;
    
    // Support both parameter names
    const finalTicketCount = tickets || ticketCount;
    
    if (!finalTicketCount || finalTicketCount < 1) {
      return res.status(400).json({ error: 'Invalid ticket count' });
    }
    
    // Get raffle
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', raffleId)
      .single();
    
    if (raffleError || !raffle) {
      return res.status(404).json({ error: 'Raffle not found' });
    }
    
    // Check raffle status
    if (raffle.status !== 'active') {
      return res.status(400).json({ error: 'Raffle is not active' });
    }
    
    // Check if draw date has passed
    if (new Date(raffle.draw_date) < new Date()) {
      return res.status(400).json({ error: 'Raffle has ended' });
    }
    
    // Check minimum tickets
    if (raffle.min_tickets && finalTicketCount < raffle.min_tickets) {
      return res.status(400).json({ error: `Minimum ${raffle.min_tickets} tickets required` });
    }
    
    // Get user's current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('ticket_balance')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough tickets
    if (user.ticket_balance < finalTicketCount) {
      return res.status(400).json({
        error: 'Insufficient tickets',
        required: finalTicketCount,
        available: user.ticket_balance
      });
    }
    
    // Create entry - triggers will auto-update totals
    const { data: entry, error: entryError } = await supabase
      .from('raffle_entries')
      .insert([{
        user_id: userId,
        raffle_id: raffleId,
        ticket_count: finalTicketCount
      }])
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
      success: true,
      message: `Entered ${finalTicketCount} ticket(s) into raffle`,
      entry: {
        id: entry.id,
        ticketCount: entry.ticket_count,
        enteredAt: entry.entered_at
      },
      remainingTickets: updatedUser.ticket_balance
    });
  } catch (error) {
    console.error('Enter raffle error:', error);
    res.status(500).json({ error: 'Failed to enter raffle' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/raffles
// Get raffles - includes BOTH active AND coming_soon
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('raffles')
      .select(`
        *,
        raffle_entries(count)
      `);
    
    // Show both active and coming_soon raffles
    if (status === 'live' || status === 'active') {
      query = query.in('status', ['active', 'coming_soon']);
    } else if (status) {
      query = query.eq('status', status);
    }
    
    // Order: featured first, then by draw date
    query = query.order('featured', { ascending: false })
                 .order('draw_date', { ascending: true });
    
    const { data: raffles, error } = await query;
    
    if (error) {
      console.error('Error fetching raffles:', error);
      throw error;
    }
    
    // Add calculated fields
    const rafflesWithExtras = raffles.map(raffle => ({
      ...raffle,
      total_entries: raffle.raffle_entries?.[0]?.count || 0,
      time_remaining: calculateTimeRemaining(raffle.draw_date),
      emoji: getCategoryEmoji(raffle.category),
      is_coming_soon: raffle.status === 'coming_soon'
    }));
    
    res.json(rafflesWithExtras);
    
  } catch (error) {
    console.error('Get raffles error:', error);
    res.status(500).json({ error: 'Failed to fetch raffles' });
  }
});

// GET /api/raffles/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: raffle, error } = await supabase
      .from('raffles')
      .select(`
        *,
        raffle_entries(count)
      `)
      .eq('id', id)
      .single();
    
    if (error || !raffle) {
      return res.status(404).json({ error: 'Raffle not found' });
    }
    
    const raffleWithExtras = {
      ...raffle,
      total_entries: raffle.raffle_entries?.[0]?.count || 0,
      time_remaining: calculateTimeRemaining(raffle.draw_date),
      emoji: getCategoryEmoji(raffle.category),
      is_coming_soon: raffle.status === 'coming_soon'
    };
    
    res.json(raffleWithExtras);
    
  } catch (error) {
    console.error('Get raffle error:', error);
    res.status(500).json({ error: 'Failed to fetch raffle' });
  }
});

// POST /api/raffles/:id/enter
router.post('/:id/enter', authenticate, async (req, res) => {
  try {
    const { id: raffleId } = req.params;
    const { tickets } = req.body;
    const userId = req.user.id;
    
    if (!tickets || tickets < 1) {
      return res.status(400).json({ error: 'Invalid ticket amount' });
    }
    
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', raffleId)
      .single();
    
    if (raffleError || !raffle) {
      return res.status(404).json({ error: 'Raffle not found' });
    }
    
    // Check if coming soon
    if (raffle.status === 'coming_soon') {
      return res.status(400).json({ error: 'This raffle is coming soon and not yet available' });
    }
    
    // Check if active
    if (raffle.status !== 'active') {
      return res.status(400).json({ error: 'Raffle is not active' });
    }
    
    // Check if ended
    if (new Date(raffle.draw_date) < new Date()) {
      return res.status(400).json({ error: 'Raffle has ended' });
    }
    
    // Check limits
    if (tickets < raffle.min_tickets) {
      return res.status(400).json({ error: `Minimum ${raffle.min_tickets} tickets required` });
    }
    if (tickets > raffle.max_tickets) {
      return res.status(400).json({ error: `Maximum ${raffle.max_tickets} tickets allowed` });
    }
    
    // Check balance
    const { data: transactions } = await supabase
      .from('ticket_transactions')
      .select('amount')
      .eq('user_id', userId);
    
    const balance = transactions
      ? transactions.reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    if (balance < tickets) {
      return res.status(400).json({ error: 'Insufficient tickets' });
    }
    
    // Create entries
    const entries = Array(tickets).fill(null).map(() => ({
      raffle_id: raffleId,
      user_id: userId
    }));
    
    const { error: entryError } = await supabase
      .from('raffle_entries')
      .insert(entries);
    
    if (entryError) throw entryError;
    
    // Deduct tickets
    const { error: deductError } = await supabase
      .from('ticket_transactions')
      .insert([{
        user_id: userId,
        amount: -tickets,
        type: 'raffle_entry',
        description: `Entered ${raffle.title} (${tickets} tickets)`
      }]);
    
    if (deductError) throw deductError;
    
    res.json({ 
      success: true, 
      message: `Successfully entered with ${tickets} tickets!`,
      entries_count: tickets
    });
    
  } catch (error) {
    console.error('Enter raffle error:', error);
    res.status(500).json({ error: 'Failed to enter raffle' });
  }
});

function calculateTimeRemaining(drawDate) {
  const now = new Date();
  const end = new Date(drawDate);
  const diff = end - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getCategoryEmoji(category) {
  const emojis = {
    'Basketball': '🏀',
    'Baseball': '⚾',
    'Football': '🏈',
    'Pokemon': '🔥',
    'Soccer': '⚽',
    'Hockey': '🏒',
    'default': '🏆'
  };
  return emojis[category] || emojis.default;
}

module.exports = router;

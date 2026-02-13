const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// GET /api/user/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // ✅ CALCULATE TICKET BALANCE
    const { data: transactions } = await supabase
      .from('ticket_transactions')
      .select('amount')
      .eq('user_id', userId);
    
    const ticketBalance = transactions && transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      : 0;
    
    // Get active entries
    const { data: entries } = await supabase
      .from('raffle_entries')
      .select('id')
      .eq('user_id', userId);
    
    const activeEntries = entries ? entries.length : 0;
    
    // Return everything
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
      subscription_status: user.subscription_status || 'free',
      ticket_balance: ticketBalance,
      active_entries: activeEntries,
      total_wins: 0
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;

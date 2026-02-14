const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// GET /api/user/profile
// Get ONLY the authenticated user's profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // ✅ From JWT token
    
    console.log('👤 Fetching profile for user ID:', userId);
    
    // Get user data - FILTERED by userId
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId) // ✅ CRITICAL: Filter by this specific user
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Found user:', user.email);
    
    // Calculate ONLY this user's ticket balance
    const { data: transactions } = await supabase
      .from('ticket_transactions')
      .select('amount')
      .eq('user_id', userId); // ✅ CRITICAL: Only this user's transactions
    
    const ticketBalance = transactions && transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      : 0;
    
    console.log('💰 User ticket balance:', ticketBalance);
    
    // Get ONLY this user's active entries
    const { data: entries } = await supabase
      .from('raffle_entries')
      .select('id')
      .eq('user_id', userId); // ✅ CRITICAL: Only this user's entries
    
    const activeEntries = entries ? entries.length : 0;
    
    console.log('🎰 User active entries:', activeEntries);
    
    // Return user data
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
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/user/tickets
// Get ONLY this user's ticket transaction history
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🎫 Fetching tickets for user:', userId);
    
    // Get ONLY this user's transactions
    const { data: transactions, error } = await supabase
      .from('ticket_transactions')
      .select('*')
      .eq('user_id', userId) // ✅ CRITICAL: Only this user
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const balance = transactions
      ? transactions.reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    res.json({
      balance,
      transactions: transactions || []
    });
    
  } catch (error) {
    console.error('❌ Tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

module.exports = router;

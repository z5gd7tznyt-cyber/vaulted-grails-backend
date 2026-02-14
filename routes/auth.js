const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// GET /api/user/profile
// Get user profile with all stats
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('👤 Fetching profile for user ID:', userId);
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Found user:', user.email);
    
    // Calculate ticket balance
    const { data: transactions } = await supabase
      .from('ticket_transactions')
      .select('amount')
      .eq('user_id', userId);
    
    const ticketBalance = transactions && transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      : 0;
    
    console.log('💰 User ticket balance:', ticketBalance);
    
    // Get active entries
    const { data: entries } = await supabase
      .from('raffle_entries')
      .select('id')
      .eq('user_id', userId);
    
    const activeEntries = entries ? entries.length : 0;
    
    console.log('🎰 User active entries:', activeEntries);
    
    // Calculate and update streak
    const streak = await calculateStreak(userId);
    
    // Return user data
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
      subscription_status: user.subscription_status || 'free',
      ticket_balance: ticketBalance,
      active_entries: activeEntries,
      total_wins: 0, // TODO: Calculate from wins table
      streak: streak
    });
    
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/user/streak
// Get and update user's daily streak
router.get('/streak', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const streak = await calculateStreak(userId);
    
    res.json({ streak });
    
  } catch (error) {
    console.error('❌ Streak error:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// Helper function to calculate and update streak
async function calculateStreak(userId) {
  try {
    // Get user's current streak data
    const { data: user } = await supabase
      .from('users')
      .select('streak_count, last_visit_date')
      .eq('id', userId)
      .single();
    
    if (!user) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = user.last_visit_date;
    
    let streakCount = user.streak_count || 0;
    
    // Only update if this is a new day
    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (lastVisit === yesterday) {
        // Consecutive day - increment streak
        streakCount += 1;
      } else if (!lastVisit || lastVisit < yesterday) {
        // Missed a day or first visit - reset to 1
        streakCount = 1;
      }
      
      // Update database
      await supabase
        .from('users')
        .update({
          streak_count: streakCount,
          last_visit_date: today
        })
        .eq('id', userId);
      
      console.log(`🔥 Updated streak for user ${userId}: Day ${streakCount}`);
    }
    
    return streakCount;
    
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

// GET /api/user/tickets
// Get ticket transaction history
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🎫 Fetching tickets for user:', userId);
    
    const { data: transactions, error } = await supabase
      .from('ticket_transactions')
      .select('*')
      .eq('user_id', userId)
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

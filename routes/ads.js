const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// POST /api/ads/watch
router.post('/watch', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Count ads watched today
    const { data: views, error: countError } = await supabase
      .from('ad_views')
      .select('*')
      .eq('user_id', userId)
      .gte('viewed_at', `${today}T00:00:00`)
      .lte('viewed_at', `${today}T23:59:59`);
    
    if (countError) throw countError;
    
    const adsWatchedToday = views?.length || 0;
    
    // Check daily limit (5 ads per day)
    if (adsWatchedToday >= 5) {
      return res.status(400).json({ 
        error: 'Daily ad limit reached (5/day)',
        adsWatchedToday: 5,
        remainingAds: 0
      });
    }
    
    // Record ad view
    const { error: adError } = await supabase
      .from('ad_views')
      .insert([{
        user_id: userId,
        tickets_earned: 1
      }]);
    
    if (adError) throw adError;
    
    // Grant ticket via transaction
    const { error: transError } = await supabase
      .from('ticket_transactions')
      .insert([{
        user_id: userId,
        amount: 1,
        type: 'ad_view',
        description: 'Earned by watching advertisement'
      }]);
    
    if (transError) throw transError;
    
    // Get updated balance
    const { data: user } = await supabase
      .from('users')
      .select('ticket_balance')
      .eq('id', userId)
      .single();
    
    res.json({
      success: true,
      message: 'Ad watched successfully',
      adsWatchedToday: adsWatchedToday + 1,
      remainingAds: 4 - adsWatchedToday,
      ticketsEarned: 1,
      newBalance: user?.ticket_balance || 0
    });
  } catch (error) {
    console.error('Watch ad error:', error);
    res.status(500).json({ error: 'Failed to process ad view' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// AdGate Media configuration (add these to Railway environment variables)
const ADGATE_API_KEY = process.env.ADGATE_API_KEY || '';
const ADGATE_SECRET = process.env.ADGATE_SECRET || '';

// GET /api/ads/check-limit
// Check if user can watch more ads today
router.get('/check-limit', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Count ads watched in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: adsToday, error } = await supabase
      .from('ad_watches')
      .select('id')
      .eq('user_id', userId)
      .gte('watched_at', twentyFourHoursAgo);
    
    if (error) {
      console.error('Check limit error:', error);
      throw error;
    }
    
    const watchedToday = adsToday ? adsToday.length : 0;
    const canWatch = watchedToday < 5;
    const remaining = Math.max(0, 5 - watchedToday);
    
    res.json({
      canWatch,
      watchedToday,
      remaining,
      limit: 5
    });
    
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ error: 'Failed to check ad limit' });
  }
});

// POST /api/ads/callback
// AdGate Media calls this endpoint when user completes an ad
router.post('/callback', async (req, res) => {
  try {
    // AdGate sends data as query parameters
    const {
      user_id,      // Your user ID
      points,       // Points earned (we use 1 point = 1 ticket)
      signature     // Security signature from AdGate
    } = req.query;
    
    console.log('AdGate callback received:', { user_id, points });
    
    // Verify signature to prevent fraud
    if (ADGATE_SECRET) {
      const expectedSignature = crypto
        .createHash('sha256')
        .update(user_id + points + ADGATE_SECRET)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid AdGate signature');
        return res.status(401).send('0'); // AdGate expects "0" for failure
      }
    }
    
    // Check daily limit (5 ads max)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: adsToday } = await supabase
      .from('ad_watches')
      .select('id')
      .eq('user_id', user_id)
      .gte('watched_at', twentyFourHoursAgo);
    
    if (adsToday && adsToday.length >= 5) {
      console.log(`User ${user_id} hit daily ad limit`);
      return res.status(400).send('0'); // Limit reached
    }
    
    // Log the ad watch
    const { error: watchError } = await supabase
      .from('ad_watches')
      .insert([{
        user_id,
        ad_provider: 'adgate',
        points_earned: parseInt(points) || 1
      }]);
    
    if (watchError) {
      console.error('Error logging ad watch:', watchError);
      return res.status(500).send('0');
    }
    
    // Grant tickets (1 ticket per ad)
    const { error: ticketError } = await supabase
      .from('ticket_transactions')
      .insert([{
        user_id,
        amount: 1,
        type: 'ad_watch',
        description: 'Earned from watching advertisement'
      }]);
    
    if (ticketError) {
      console.error('Error granting tickets:', ticketError);
      return res.status(500).send('0');
    }
    
    console.log(`✅ Granted 1 ticket to user ${user_id} for watching ad`);
    
    // AdGate expects "1" response for success
    res.send('1');
    
  } catch (error) {
    console.error('Ad callback error:', error);
    res.status(500).send('0');
  }
});

// POST /api/ads/manual-grant
// TEMPORARY: Manual ticket grant for testing (remove when AdGate is integrated)
router.post('/manual-grant', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check daily limit
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: adsToday } = await supabase
      .from('ad_watches')
      .select('id')
      .eq('user_id', userId)
      .gte('watched_at', twentyFourHoursAgo);
    
    if (adsToday && adsToday.length >= 5) {
      return res.status(400).json({ error: 'Daily limit reached' });
    }
    
    // Log ad watch
    await supabase
      .from('ad_watches')
      .insert([{
        user_id: userId,
        ad_provider: 'manual_test',
        points_earned: 1
      }]);
    
    // Grant ticket
    await supabase
      .from('ticket_transactions')
      .insert([{
        user_id: userId,
        amount: 1,
        type: 'ad_watch',
        description: 'Earned from watching advertisement'
      }]);
    
    res.json({ success: true, ticketsGranted: 1 });
    
  } catch (error) {
    console.error('Manual grant error:', error);
    res.status(500).json({ error: 'Failed to grant ticket' });
  }
});

// GET /api/ads/stats
// Get ad watching statistics for user
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Total ads watched all time
    const { data: totalAds } = await supabase
      .from('ad_watches')
      .select('id')
      .eq('user_id', userId);
    
    // Ads watched today
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: adsToday } = await supabase
      .from('ad_watches')
      .select('id')
      .eq('user_id', userId)
      .gte('watched_at', twentyFourHoursAgo);
    
    // Total tickets earned from ads
    const { data: adTickets } = await supabase
      .from('ticket_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'ad_watch');
    
    const totalTicketsFromAds = adTickets 
      ? adTickets.reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    res.json({
      totalAdsWatched: totalAds ? totalAds.length : 0,
      adsWatchedToday: adsToday ? adsToday.length : 0,
      totalTicketsFromAds,
      dailyLimit: 5,
      remaining: Math.max(0, 5 - (adsToday ? adsToday.length : 0))
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

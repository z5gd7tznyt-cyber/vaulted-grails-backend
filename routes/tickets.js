// ============================================================
// TICKET ROUTES
// ============================================================
// GET /api/tickets/balance - Get user's ticket balance
// POST /api/tickets/purchase - Purchase ticket package
// POST /api/tickets/watch-ad - Earn free ticket from ad
// GET /api/tickets/packages - Get available packages
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const { TICKET_PACKAGES, createTicketPayment } = require('../utils/stripe');

// ============================================================
// GET TICKET BALANCE
// ============================================================

router.get('/balance', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('ticket_balance, subscription_status')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        res.json({
            balance: user.ticket_balance,
            subscriptionStatus: user.subscription_status
        });
        
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ 
            error: 'Failed to get ticket balance' 
        });
    }
});

// ============================================================
// GET AVAILABLE PACKAGES
// ============================================================

router.get('/packages', (req, res) => {
    res.json({
        packages: Object.entries(TICKET_PACKAGES).map(([id, pkg]) => ({
            id,
            ...pkg,
            priceDisplay: `$${(pkg.price / 100).toFixed(2)}`
        }))
    });
});

// ============================================================
// PURCHASE TICKET PACKAGE
// ============================================================

router.post('/purchase', authenticate, async (req, res) => {
    try {
        const { packageId } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        if (!TICKET_PACKAGES[packageId]) {
            return res.status(400).json({ 
                error: 'Invalid package' 
            });
        }
        
        // Create Stripe payment intent
        const payment = await createTicketPayment(packageId, userId, userEmail);
        
        res.json({
            clientSecret: payment.clientSecret,
            package: payment.packageInfo
        });
        
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ 
            error: 'Failed to create payment' 
        });
    }
});

// ============================================================
// WATCH AD FOR FREE TICKET
// ============================================================

router.post('/watch-ad', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { adId } = req.body;
        
        // Check how many ads watched today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayViews, error: countError } = await supabase
            .from('ad_views')
            .select('*')
            .eq('user_id', userId)
            .gte('viewed_at', today.toISOString());
        
        if (countError) throw countError;
        
        // Limit: 5 ads per day
        if (todayViews.length >= 5) {
            return res.status(429).json({ 
                error: 'Daily ad limit reached (5/day)',
                nextAvailable: 'Tomorrow'
            });
        }
        
        // Record ad view
        const { error: viewError } = await supabase
            .from('ad_views')
            .insert({
                user_id: userId,
                ad_id: adId,
                tickets_earned: 1
            });
        
        if (viewError) throw viewError;
        
        // Add ticket to user's balance
        const { error: txError } = await supabase
            .from('ticket_transactions')
            .insert({
                user_id: userId,
                amount: 1,
                type: 'ad_reward',
                description: 'Watched advertisement'
            });
        
        if (txError) throw txError;
        
        // Get updated balance
        const { data: user } = await supabase
            .from('users')
            .select('ticket_balance')
            .eq('id', userId)
            .single();
        
        res.json({
            message: 'Ticket earned!',
            ticketsEarned: 1,
            newBalance: user.ticket_balance,
            adsWatchedToday: todayViews.length + 1,
            adsRemainingToday: 4 - todayViews.length
        });
        
    } catch (error) {
        console.error('Watch ad error:', error);
        res.status(500).json({ 
            error: 'Failed to process ad reward' 
        });
    }
});

module.exports = router;

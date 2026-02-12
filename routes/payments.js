const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

// ✅ YOUR STRIPE PRICE IDs - ALREADY FILLED IN!
const PRICE_IDS = {
  vault_access: 'price_1T04afDiiuHlldHOnJN2y9uQ',  // $7.99/month
  starter: 'price_1T04aeDiiuHlldHOj1UCzXEa',       // $4.99 - 100 tickets
  power: 'price_1T04adDiiuHlldHOqBjDLsn8',         // $9.99 - 250 tickets
  premium: 'price_1T04acDiiuHlldHOkeq3LpeD',       // $19.99 - 750 tickets
  elite: 'price_1T04aZDiiuHlldHOdRw9BxwY',         // $49.99 - 3,000 tickets
  whale: 'price_1T04aVDiiuHlldHOmUIJkDoo'          // $139.99 - 25,000 tickets
};

// Ticket amounts for each pack
const TICKET_AMOUNTS = {
  starter: 100,
  power: 250,
  premium: 750,
  elite: 3000,
  whale: 25000
};

// POST /api/payments/create-checkout
// Create Stripe Checkout Session for one-time ticket purchase
router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { packType, amount, tickets } = req.body;
    const userId = req.user.id;
    
    if (!packType || !PRICE_IDS[packType]) {
      return res.status(400).json({ error: 'Invalid pack type' });
    }
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      
      customerId = customer.id;
      
      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }
    
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[packType],
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/dashboard.html?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/tickets.html?payment=cancelled`,
      metadata: {
        userId,
        packType,
        tickets: tickets.toString()
      }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/payments/create-subscription
// Create Stripe Checkout Session for Vault Access subscription
router.post('/create-subscription', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      
      customerId = customer.id;
      
      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }
    
    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS.vault_access,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard.html?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/tickets.html?subscription=cancelled`,
      metadata: {
        userId
      }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/payments/webhook
// Stripe webhook to handle payment events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await handleSubscriptionCancelled(deletedSub);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

// Handle completed checkout (one-time purchase)
async function handleCheckoutComplete(session) {
  try {
    const { userId, packType, tickets } = session.metadata;
    
    if (!userId || !tickets) {
      console.error('Missing metadata in session');
      return;
    }
    
    const ticketAmount = parseInt(tickets);
    
    // Create ticket transaction
    const { error } = await supabase
      .from('ticket_transactions')
      .insert([{
        user_id: userId,
        amount: ticketAmount,
        type: 'purchase',
        stripe_payment_id: session.payment_intent,
        description: `Purchased ${packType} pack (${ticketAmount} tickets)`
      }]);
    
    if (error) {
      console.error('Error creating transaction:', error);
    }
    
    console.log(`✅ Tickets granted: ${ticketAmount} to user ${userId}`);
  } catch (error) {
    console.error('Error handling checkout:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      console.error('Missing userId in subscription metadata');
      return;
    }
    
    // Update or create subscription record
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert([{
        user_id: userId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
      }], {
        onConflict: 'stripe_subscription_id'
      });
    
    if (subError) {
      console.error('Error updating subscription:', subError);
    }
    
    // Update user subscription status
    await supabase
      .from('users')
      .update({ 
        subscription_status: subscription.status === 'active' ? 'premium' : 'free'
      })
      .eq('id', userId);
    
    // If active, grant monthly tickets
    if (subscription.status === 'active') {
      await supabase
        .from('ticket_transactions')
        .insert([{
          user_id: userId,
          amount: 100,
          type: 'subscription',
          description: 'Monthly Vault Access bonus tickets'
        }]);
      
      console.log(`✅ Subscription activated: 100 bonus tickets to user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    if (!userId) return;
    
    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);
    
    // Update user status
    await supabase
      .from('users')
      .update({ subscription_status: 'free' })
      .eq('id', userId);
    
    console.log(`❌ Subscription cancelled for user ${userId}`);
  } catch (error) {
    console.error('Error handling cancellation:', error);
  }
}

module.exports = router;

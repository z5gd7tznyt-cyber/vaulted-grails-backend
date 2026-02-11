// ============================================================
// STRIPE PAYMENT PROCESSING
// ============================================================
// This file handles all Stripe payment operations
// ============================================================

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================================
// TICKET PACKAGES
// ============================================================
// Easy to edit! Just modify the prices/tickets here

const TICKET_PACKAGES = {
    package_100: {
        tickets: 100,
        price: 499, // $4.99 in cents
        name: 'Starter Pack'
    },
    package_250: {
        tickets: 250,
        price: 999, // $9.99 in cents
        name: 'Value Pack'
    },
    package_600: {
        tickets: 600,
        price: 1999, // $19.99 in cents
        name: 'Power Pack'
    },
    package_1500: {
        tickets: 1500,
        price: 4999, // $49.99 in cents
        name: 'Mega Pack'
    },
    package_25000: {
        tickets: 25000,
        price: 13999, // $139.99 in cents
        name: 'Whale Pack'
    }
};

// Premium subscription
const PREMIUM_SUBSCRIPTION = {
    price: 799, // $7.99 in cents
    tickets: 500,
    name: 'Premium Membership'
};

// ============================================================
// PAYMENT FUNCTIONS
// ============================================================

/**
 * Create payment intent for ticket purchase
 */
async function createTicketPayment(packageId, userId, userEmail) {
    try {
        const package = TICKET_PACKAGES[packageId];
        
        if (!package) {
            throw new Error('Invalid package');
        }
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: package.price,
            currency: 'usd',
            metadata: {
                userId,
                packageId,
                tickets: package.tickets,
                type: 'ticket_purchase'
            },
            receipt_email: userEmail
        });
        
        return {
            clientSecret: paymentIntent.client_secret,
            packageInfo: package
        };
        
    } catch (error) {
        console.error('Stripe payment error:', error);
        throw error;
    }
}

/**
 * Create subscription for premium membership
 */
async function createPremiumSubscription(userId, userEmail, paymentMethodId) {
    try {
        // Create or get customer
        let customer;
        
        // Check if customer exists
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1
        });
        
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({
                email: userEmail,
                metadata: { userId }
            });
        }
        
        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id
        });
        
        // Set as default payment method
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: paymentMethodId
            }
        });
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: PREMIUM_SUBSCRIPTION.name
                    },
                    recurring: {
                        interval: 'month'
                    },
                    unit_amount: PREMIUM_SUBSCRIPTION.price
                }
            }],
            metadata: {
                userId,
                tickets: PREMIUM_SUBSCRIPTION.tickets
            }
        });
        
        return {
            subscriptionId: subscription.id,
            customerId: customer.id,
            status: subscription.status
        };
        
    } catch (error) {
        console.error('Stripe subscription error:', error);
        throw error;
    }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });
        
        return subscription;
        
    } catch (error) {
        console.error('Stripe cancel error:', error);
        throw error;
    }
}

/**
 * Verify webhook signature
 */
function verifyWebhook(payload, signature) {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        return event;
    } catch (error) {
        console.error('Webhook verification failed:', error);
        throw error;
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    stripe,
    TICKET_PACKAGES,
    PREMIUM_SUBSCRIPTION,
    createTicketPayment,
    createPremiumSubscription,
    cancelSubscription,
    verifyWebhook
};

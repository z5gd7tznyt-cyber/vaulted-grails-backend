-- ============================================================
-- VAULTED GRAILS - COMPLETE DATABASE SCHEMA
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. USERS TABLE (Customer Accounts)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    ticket_balance INTEGER DEFAULT 0,
    subscription_status VARCHAR(50) DEFAULT 'free',
    subscription_tier VARCHAR(50) DEFAULT NULL,
    stripe_customer_id VARCHAR(100),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. RAFFLES TABLE (Live Raffle Database)
-- ============================================================
CREATE TABLE raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    year VARCHAR(10),
    grade VARCHAR(50),
    value INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    draw_date TIMESTAMP NOT NULL,
    min_tickets INTEGER DEFAULT 1,
    max_tickets INTEGER DEFAULT 1000,
    total_entries INTEGER DEFAULT 0,
    winner_user_id UUID REFERENCES users(id),
    winner_selected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. RAFFLE ENTRIES TABLE (Customer Entries)
-- ============================================================
CREATE TABLE raffle_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    raffle_id UUID REFERENCES raffles(id) ON DELETE CASCADE NOT NULL,
    ticket_count INTEGER NOT NULL,
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. TICKET TRANSACTIONS TABLE (Customer Information)
-- ============================================================
CREATE TABLE ticket_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    stripe_payment_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. SUBSCRIPTIONS TABLE (Premium Subscriptions)
-- ============================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. AD VIEWS TABLE (Free Ticket Tracking)
-- ============================================================
CREATE TABLE ad_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    ad_id VARCHAR(100),
    tickets_earned INTEGER DEFAULT 1,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_raffles_category ON raffles(category);
CREATE INDEX idx_raffles_draw_date ON raffles(draw_date);
CREATE INDEX idx_raffle_entries_user ON raffle_entries(user_id);
CREATE INDEX idx_raffle_entries_raffle ON raffle_entries(raffle_id);
CREATE INDEX idx_ticket_transactions_user ON ticket_transactions(user_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_ad_views_user ON ad_views(user_id);

-- ============================================================
-- AUTOMATIC FUNCTIONS (Auto-update totals)
-- ============================================================

-- Function: Update raffle total_entries when entry is added
CREATE OR REPLACE FUNCTION update_raffle_entries()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE raffles
    SET total_entries = (
        SELECT COALESCE(SUM(ticket_count), 0)
        FROM raffle_entries
        WHERE raffle_id = NEW.raffle_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.raffle_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update total_entries
CREATE TRIGGER trigger_update_raffle_entries
AFTER INSERT ON raffle_entries
FOR EACH ROW
EXECUTE FUNCTION update_raffle_entries();

-- Function: Update user ticket_balance after transaction
CREATE OR REPLACE FUNCTION update_user_tickets()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET ticket_balance = ticket_balance + NEW.amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update user ticket balance
CREATE TRIGGER trigger_update_user_tickets
AFTER INSERT ON ticket_transactions
FOR EACH ROW
EXECUTE FUNCTION update_user_tickets();

-- Function: Deduct tickets when entering raffle
CREATE OR REPLACE FUNCTION deduct_raffle_tickets()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET ticket_balance = ticket_balance - NEW.ticket_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Deduct tickets on raffle entry
CREATE TRIGGER trigger_deduct_raffle_tickets
AFTER INSERT ON raffle_entries
FOR EACH ROW
EXECUTE FUNCTION deduct_raffle_tickets();

-- ============================================================
-- SAMPLE DATA (for testing)
-- ============================================================

-- Sample Raffle 1: Basketball
INSERT INTO raffles (title, category, year, grade, value, image_url, draw_date, featured, description)
VALUES (
    '1986 Michael Jordan Rookie PSA 10',
    'basketball',
    '1986',
    'PSA 10',
    125000,
    'https://via.placeholder.com/400x560/FFD700/000000?text=Jordan+PSA+10',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    true,
    'The holy grail of basketball cards. Fleer #57 in pristine PSA 10 condition. Investment-grade collectible.'
);

-- Sample Raffle 2: Pokemon
INSERT INTO raffles (title, category, year, grade, value, image_url, draw_date, featured, description)
VALUES (
    '1999 Charizard Holo 1st Edition PSA 10',
    'pokemon',
    '1999',
    'PSA 10',
    85000,
    'https://via.placeholder.com/400x560/FFD700/000000?text=Charizard+PSA+10',
    CURRENT_TIMESTAMP + INTERVAL '25 days',
    true,
    'The most iconic Pokemon card ever made. Base Set 1st Edition Charizard in perfect PSA 10 condition.'
);

-- Sample Raffle 3: One Piece
INSERT INTO raffles (title, category, year, grade, value, image_url, draw_date, description)
VALUES (
    'Luffy Gear 5 Parallel Rare PSA 10',
    'onepiece',
    '2023',
    'PSA 10',
    5000,
    'https://via.placeholder.com/400x560/FFD700/000000?text=Luffy+Gear+5',
    CURRENT_TIMESTAMP + INTERVAL '20 days',
    'Ultra-rare parallel version of Luffy in Gear 5 form. PSA 10 gem mint condition.'
);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Database setup complete! ✅' AS status;
SELECT 'Total tables created: 6' AS info;
SELECT 'Sample raffles added: 3' AS info;

-- Waitlist Entries table
-- Stores survey responses captured on the early-access waitlist page.
-- Table name: waitlist_entries (does NOT conflict with existing tables:
--   users, designs, orders, payments, webhook_events)
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL,
    pain_point     VARCHAR(100),          -- 'time' | 'cost' | 'skill' | 'inspiration'
    workflow       VARCHAR(100),          -- 'adobe' | 'canva' | 'outsource' | 'none'
    frequency      VARCHAR(100),          -- 'daily' | 'weekly' | 'monthly' | 'yearly'
    source         VARCHAR(100) DEFAULT 'waitlist_landing_v1',
    ip_address     VARCHAR(45),           -- IPv4/IPv6 of submitter (optional, for dedup)
    created_at     TIMESTAMP DEFAULT NOW()
);

-- Partial unique index so the same email can only appear once
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_entries_email
    ON waitlist_entries (email);

-- Index to speed up admin look-ups by date
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_created_at
    ON waitlist_entries (created_at DESC);

-- Add phone_number column to waitlist table
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create waitlist table for Drut landing page
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  exam_interest TEXT NOT NULL,
  beta_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for email lookups (for duplicate checking)
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Add unique constraint on email to prevent duplicates
ALTER TABLE waitlist ADD CONSTRAINT unique_email UNIQUE (email);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for waitlist form submissions)
CREATE POLICY "Allow anonymous waitlist signups"
  ON waitlist FOR INSERT
  TO anon
  WITH CHECK (true);

-- Optional: Allow reading all waitlist entries (for admin purposes)
-- You can remove this if you don't want public access to read the waitlist
CREATE POLICY "Allow read access to waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (true);

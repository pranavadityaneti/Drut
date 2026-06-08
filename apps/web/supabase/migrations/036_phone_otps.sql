-- Phone OTPs table for WhatsApp OTP authentication
CREATE TABLE IF NOT EXISTS phone_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    otp text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by phone + otp
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone_otp ON phone_otps (phone, otp);

-- Auto-cleanup: delete expired OTPs (older than 1 hour)
-- This can be run periodically via a cron job or Supabase scheduled function
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM phone_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can access this table
-- No client-side access — OTPs are managed entirely server-side
CREATE POLICY "Service role only" ON phone_otps
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

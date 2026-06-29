-- ============================================================
-- Razorpay saved-payment (one-tap repeat) — Phase 1: customer reference table
-- ------------------------------------------------------------
-- Stores ONLY the opaque Razorpay Customer id per user (e.g. 'cust_xxx'). Razorpay
-- holds the actual card/UPI (network-tokenized — their PCI scope, not ours). On a
-- returning checkout we pass this customer_id so Razorpay shows the user's saved
-- methods for one-tap pay. NO card/UPI/financial data is ever stored here.
--
-- Access: only the edge functions (service_role, which bypasses RLS) read/write this.
-- RLS is ON with NO policies, so anon/authenticated clients cannot touch it.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.razorpay_customers (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_customer_id text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.razorpay_customers ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: no direct client access (service_role bypasses these grants/RLS).
REVOKE ALL ON public.razorpay_customers FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- allow_comp_subscriptions: permit ₹0 ("comp") subscriptions so admins can grant
-- Pro to beta testers without a payment. The original constraint was
-- amount_paise > 0 (real Razorpay charges); comps are amount_paise = 0 with
-- razorpay_order_id = 'comp-<uuid>' and no payment id. Revenue queries sum only
-- non-pending amounts, so ₹0 comps contribute nothing.
--
-- Robust + idempotent: drop ANY existing CHECK constraint on amount_paise
-- (regardless of its auto-generated name), then install the non-negative check.

do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%amount_paise%'
  loop
    execute format('alter table public.subscriptions drop constraint %I', c);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_amount_paise_nonneg check (amount_paise >= 0);

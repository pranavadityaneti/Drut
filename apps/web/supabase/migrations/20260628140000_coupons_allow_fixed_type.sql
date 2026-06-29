-- Allow the 'fixed' coupon type (sets the FINAL price). The TS types, _shared/coupon.ts
-- pricing math, the admin-coupons edge fn, and the AdminCoupons UI all already support
-- 'fixed'; only the DB CHECK still rejected it, so creating a 'fixed' coupon 500'd.
--
-- Idempotent: drops whatever CHECK governs coupons.type (the `type IN (...)` one only —
-- NOT the separate `type <> 'percent' OR value <= 100` percent-cap check), then re-adds
-- the widened one. Safe to run repeatedly and regardless of any earlier manual DO-block.

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.coupons'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%(type = any%'
  loop
    execute format('alter table public.coupons drop constraint %I', c);
  end loop;

  alter table public.coupons
    add constraint coupons_type_check check (type in ('percent','flat','fixed'));
end $$;

comment on column public.coupons.type is 'percent (0..100), flat (paise off), or fixed (final price in paise).';

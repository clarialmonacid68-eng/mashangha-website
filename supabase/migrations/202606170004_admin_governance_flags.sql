-- Admin high-risk governance flags.
--
-- These flags let operators stop new activity without rewriting historical
-- financial records (per OPERATIONS.md: freezing/suspending only blocks new
-- actions, it never edits past payments, deliveries or status history).
--
--   orders.is_frozen     : when true, the order rejects new customer/developer
--                          actions (payment, messages, delivery, acceptance,
--                          settlement, review). Existing records are untouched.
--   demands.is_suspended : when true, the demand is hidden from the public
--                          marketplace and cannot receive new quotes/selection.
--
-- profiles.is_suspended already exists (user ban) and is reused as-is.

alter table public.orders
  add column if not exists is_frozen boolean not null default false;

alter table public.demands
  add column if not exists is_suspended boolean not null default false;

comment on column public.orders.is_frozen is
  'Admin freeze flag. Blocks new order actions only; never alters historical financial records.';
comment on column public.demands.is_suspended is
  'Admin suspension flag. Hides the demand from the public marketplace and blocks new quotes.';

-- Fix potential deadlock in select_quote_for_order.
--
-- Root cause: the original function locked quotes first, then demands. Two concurrent
-- calls selecting different quotes for the same demand would therefore hold their
-- respective quote locks and then both block waiting for the demand lock — a classic
-- A→B / B→A deadlock. PostgreSQL's deadlock detector resolves it by aborting one
-- transaction, but the behaviour is implicit and non-deterministic.
--
-- Fix: establish a global lock order of demands-before-quotes. Because demand_id is
-- stored on the quote row and is immutable after insert, we can read it without a lock,
-- acquire the demand lock, and then acquire the quote lock. Two concurrent calls now
-- both serialize on the demand row before they ever touch their quote rows, so the
-- second caller blocks at step 1 and holds no other lock — deadlock is impossible.
create or replace function public.select_quote_for_order(quote_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  v_demand_id     uuid;
  chosen_quote    public.quotes;
  target_demand   public.demands;
  created_order   public.orders;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Step 1: read demand_id without a lock.
  -- demand_id is a FK set at insert time and never changes, so a non-locking read is safe.
  select demand_id
  into   v_demand_id
  from   public.quotes
  where  id = quote_id;

  if v_demand_id is null then
    raise exception 'Quote not found';
  end if;

  -- Step 2: lock the demand row first (global lock order: demands → quotes).
  select *
  into   target_demand
  from   public.demands
  where  id = v_demand_id
  for update;

  if target_demand.id is null then
    raise exception 'Demand not found';
  end if;

  -- Step 3: lock the quote row second.
  select *
  into   chosen_quote
  from   public.quotes
  where  id = quote_id
  for update;

  if chosen_quote.id is null then
    raise exception 'Quote not found';
  end if;

  -- Validate quote state.
  if chosen_quote.status <> 'active' then
    raise exception 'Quote is no longer active';
  end if;

  if chosen_quote.expires_at is not null and chosen_quote.expires_at <= now() then
    raise exception 'Quote has expired';
  end if;

  -- Validate demand state and ownership.
  if target_demand.customer_id <> current_user_id then
    raise exception 'Only the demand owner can select a quote';
  end if;

  if target_demand.customer_id = chosen_quote.developer_id then
    raise exception 'Customers cannot select their own quote';
  end if;

  if target_demand.status <> 'published' then
    raise exception 'Demand is not open for selection';
  end if;

  update public.quotes
  set    status = 'selected'
  where  id = chosen_quote.id;

  update public.quotes
  set    status = 'rejected'
  where  demand_id = chosen_quote.demand_id
    and  id <> chosen_quote.id
    and  status = 'active';

  insert into public.orders (
    customer_id,
    developer_id,
    demand_id,
    quote_id,
    amount_cents,
    commission_bps,
    status
  )
  values (
    target_demand.customer_id,
    chosen_quote.developer_id,
    target_demand.id,
    chosen_quote.id,
    chosen_quote.amount_cents,
    1000,
    'pending_payment'
  )
  returning * into created_order;

  update public.demands
  set    status     = 'matched',
         matched_at = now()
  where  id = target_demand.id;

  return created_order;
end;
$$;

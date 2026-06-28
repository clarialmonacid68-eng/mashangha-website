alter table public.quotes
  add column expires_at timestamptz;

create or replace function public.select_quote_for_order(quote_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  chosen_quote public.quotes;
  target_demand public.demands;
  created_order public.orders;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into chosen_quote
  from public.quotes
  where id = quote_id
  for update;

  if chosen_quote.id is null then
    raise exception 'Quote not found';
  end if;

  if chosen_quote.status <> 'active' then
    raise exception 'Quote is no longer active';
  end if;

  if chosen_quote.expires_at is not null and chosen_quote.expires_at <= now() then
    raise exception 'Quote has expired';
  end if;

  select *
  into target_demand
  from public.demands
  where id = chosen_quote.demand_id
  for update;

  if target_demand.id is null then
    raise exception 'Demand not found';
  end if;

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
  set status = 'selected'
  where id = chosen_quote.id;

  update public.quotes
  set status = 'rejected'
  where demand_id = chosen_quote.demand_id
    and id <> chosen_quote.id
    and status = 'active';

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
  set status = 'matched',
      matched_at = now()
  where id = target_demand.id;

  return created_order;
end;
$$;

revoke execute on function public.select_quote_for_order(uuid) from public, anon;
grant execute on function public.select_quote_for_order(uuid) to authenticated;

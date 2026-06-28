alter table public.payments
  add column idempotency_key text,
  add column paid_at timestamptz,
  add column closed_at timestamptz;

create unique index payments_provider_idempotency_key
on public.payments (provider, idempotency_key)
where idempotency_key is not null;

create unique index payments_one_effective_per_order
on public.payments (order_id)
where status in ('created', 'pending');

create or replace function public.create_mock_payment(
  target_order_id uuid,
  payment_idempotency_key text,
  provider_payment_id text
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
  existing_payment public.payments;
  created_payment public.payments;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into existing_payment
  from public.payments
  where provider = 'mock'
    and idempotency_key = payment_idempotency_key;

  if existing_payment.id is not null then
    return existing_payment;
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception 'Order not found';
  end if;

  if target_order.customer_id <> current_user_id then
    raise exception 'Only the order customer can create payment';
  end if;

  if target_order.status <> 'pending_payment' then
    raise exception 'Order is not awaiting payment';
  end if;

  select *
  into existing_payment
  from public.payments
  where order_id = target_order.id
    and status in ('created', 'pending');

  if existing_payment.id is not null then
    return existing_payment;
  end if;

  insert into public.payments (
    order_id,
    provider,
    platform_payment_no,
    provider_transaction_id,
    amount_cents,
    status,
    idempotency_key,
    raw_status
  )
  values (
    target_order.id,
    'mock',
    provider_payment_id,
    provider_payment_id,
    target_order.amount_cents,
    'pending',
    payment_idempotency_key,
    jsonb_build_object('providerPaymentId', provider_payment_id, 'status', 'pending')
  )
  returning * into created_payment;

  return created_payment;
end;
$$;

create or replace function public.confirm_mock_payment(provider_payment_id text)
returns table(payment public.payments, target_order public.orders)
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_payment public.payments;
  locked_order public.orders;
begin
  select *
  into locked_payment
  from public.payments
  where provider = 'mock'
    and provider_transaction_id = provider_payment_id
  for update;

  if locked_payment.id is null then
    raise exception 'Payment not found';
  end if;

  select *
  into locked_order
  from public.orders
  where id = locked_payment.order_id
  for update;

  if locked_payment.status = 'succeeded' then
    payment := locked_payment;
    target_order := locked_order;
    return next;
    return;
  end if;

  if locked_payment.status <> 'pending' then
    raise exception 'Payment cannot be confirmed';
  end if;

  update public.payments
  set status = 'succeeded',
      paid_at = now(),
      raw_status = jsonb_build_object('providerPaymentId', provider_payment_id, 'status', 'succeeded')
  where id = locked_payment.id
  returning * into locked_payment;

  update public.orders
  set status = 'in_progress',
      paid_at = now(),
      version = version + 1
  where id = locked_order.id
    and status = 'pending_payment'
  returning * into locked_order;

  if locked_order.id is null then
    raise exception 'Order payment state conflict';
  end if;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    reason
  )
  values (
    locked_payment.order_id,
    'pending_payment',
    'in_progress',
    'mock payment confirmed'
  );

  payment := locked_payment;
  target_order := locked_order;
  return next;
end;
$$;

create or replace function public.close_mock_payment(provider_payment_id text)
returns table(payment public.payments, target_order public.orders)
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_payment public.payments;
  locked_order public.orders;
begin
  select *
  into locked_payment
  from public.payments
  where provider = 'mock'
    and provider_transaction_id = provider_payment_id
  for update;

  if locked_payment.id is null then
    raise exception 'Payment not found';
  end if;

  select *
  into locked_order
  from public.orders
  where id = locked_payment.order_id
  for update;

  if locked_payment.status = 'closed' then
    payment := locked_payment;
    target_order := locked_order;
    return next;
    return;
  end if;

  if locked_payment.status <> 'pending' then
    raise exception 'Payment cannot be closed';
  end if;

  update public.payments
  set status = 'closed',
      closed_at = now(),
      raw_status = jsonb_build_object('providerPaymentId', provider_payment_id, 'status', 'closed')
  where id = locked_payment.id
  returning * into locked_payment;

  update public.orders
  set status = 'closed',
      version = version + 1
  where id = locked_order.id
    and status = 'pending_payment'
  returning * into locked_order;

  if locked_order.id is null then
    raise exception 'Order close state conflict';
  end if;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    reason
  )
  values (
    locked_payment.order_id,
    'pending_payment',
    'closed',
    'mock payment closed'
  );

  payment := locked_payment;
  target_order := locked_order;
  return next;
end;
$$;

revoke execute on function public.create_mock_payment(uuid, text, text) from public, anon;
revoke execute on function public.confirm_mock_payment(text) from public, anon;
revoke execute on function public.close_mock_payment(text) from public, anon;
grant execute on function public.create_mock_payment(uuid, text, text) to authenticated;
grant execute on function public.confirm_mock_payment(text) to service_role;
grant execute on function public.close_mock_payment(text) to service_role;

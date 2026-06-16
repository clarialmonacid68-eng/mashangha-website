create or replace function public.submit_order_delivery(
  target_order_id uuid,
  delivery_notes text,
  delivery_url text default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
  next_version integer;
  created_delivery public.deliveries;
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  if char_length(trim(delivery_notes)) < 5 then
    raise exception '交付说明至少 5 个字符';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception '订单不存在';
  end if;

  if target_order.developer_id <> current_user_id then
    raise exception '只有接单开发者可以交付';
  end if;

  if target_order.status <> 'in_progress' then
    raise exception '订单当前不可交付';
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.deliveries
  where order_id = target_order.id;

  update public.deliveries
  set is_current = false
  where order_id = target_order.id
    and is_current;

  insert into public.deliveries (
    order_id,
    developer_id,
    version,
    notes,
    delivery_url,
    is_current
  )
  values (
    target_order.id,
    current_user_id,
    next_version,
    trim(delivery_notes),
    nullif(trim(coalesce(delivery_url, '')), ''),
    true
  )
  returning * into created_delivery;

  update public.orders
  set status = 'delivered',
      version = version + 1
  where id = target_order.id
    and status = 'in_progress';

  if not found then
    raise exception '订单状态冲突';
  end if;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_id,
    reason
  )
  values (
    target_order.id,
    'in_progress',
    'delivered',
    current_user_id,
    'developer submitted delivery'
  );

  return created_delivery;
end;
$$;

revoke execute on function public.submit_order_delivery(uuid, text, text) from public, anon;
grant execute on function public.submit_order_delivery(uuid, text, text) to authenticated;

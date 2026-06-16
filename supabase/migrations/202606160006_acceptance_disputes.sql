create or replace function public.accept_order_delivery(target_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception '订单不存在';
  end if;

  if target_order.customer_id <> current_user_id then
    raise exception '只有订单客户可以验收';
  end if;

  if target_order.status <> 'delivered' then
    raise exception '订单当前不可验收';
  end if;

  update public.orders
  set status = 'accepted',
      accepted_at = now(),
      version = version + 1
  where id = target_order.id
    and status = 'delivered'
  returning * into target_order;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_id,
    reason
  )
  values (
    target_order.id,
    'delivered',
    'accepted',
    current_user_id,
    'customer accepted delivery'
  );

  return target_order;
end;
$$;

create or replace function public.reject_order_delivery(
  target_order_id uuid,
  rejection_reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
  normalized_reason text := trim(coalesce(rejection_reason, ''));
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  if char_length(normalized_reason) < 5 then
    raise exception '拒绝验收必须提交理由';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception '订单不存在';
  end if;

  if target_order.customer_id <> current_user_id then
    raise exception '只有订单客户可以拒绝验收';
  end if;

  if target_order.status <> 'delivered' then
    raise exception '订单当前不可拒绝验收';
  end if;

  update public.orders
  set status = 'in_progress',
      version = version + 1
  where id = target_order.id
    and status = 'delivered'
  returning * into target_order;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_id,
    reason
  )
  values (
    target_order.id,
    'delivered',
    'in_progress',
    current_user_id,
    normalized_reason
  );

  return target_order;
end;
$$;

create or replace function public.open_order_dispute(
  target_order_id uuid,
  dispute_reason text,
  requested_dispute_resolution text
)
returns public.disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
  created_dispute public.disputes;
  normalized_reason text := trim(coalesce(dispute_reason, ''));
  normalized_resolution text := trim(coalesce(requested_dispute_resolution, ''));
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  if char_length(normalized_reason) < 10 then
    raise exception '仲裁原因至少 10 个字符';
  end if;

  if normalized_resolution not in ('continue', 'accept', 'refund') then
    raise exception '仲裁诉求不合法';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception '订单不存在';
  end if;

  if current_user_id not in (target_order.customer_id, target_order.developer_id) then
    raise exception '无权访问该订单';
  end if;

  if target_order.status not in ('in_progress', 'delivered', 'accepted') then
    raise exception '订单当前不可发起仲裁';
  end if;

  insert into public.disputes (
    order_id,
    opened_by,
    reason,
    requested_resolution
  )
  values (
    target_order.id,
    current_user_id,
    normalized_reason,
    normalized_resolution
  )
  returning * into created_dispute;

  update public.orders
  set status = 'disputed',
      version = version + 1
  where id = target_order.id;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_id,
    reason
  )
  values (
    target_order.id,
    target_order.status,
    'disputed',
    current_user_id,
    normalized_reason
  );

  return created_dispute;
end;
$$;

create or replace function public.create_order_review(
  target_order_id uuid,
  rating_value integer,
  review_body text default null,
  public_review boolean default true
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.orders;
  subject_user_id uuid;
  created_review public.reviews;
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  if rating_value not between 1 and 5 then
    raise exception '评分必须在 1 到 5 之间';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id;

  if target_order.id is null then
    raise exception '订单不存在';
  end if;

  if current_user_id = target_order.customer_id then
    subject_user_id := target_order.developer_id;
  elsif current_user_id = target_order.developer_id then
    subject_user_id := target_order.customer_id;
  else
    raise exception '无权评价该订单';
  end if;

  if target_order.status <> 'completed' then
    raise exception '只有已完成订单可以评价';
  end if;

  if exists (
    select 1
    from public.reviews
    where order_id = target_order.id
      and author_id = current_user_id
  ) then
    raise exception '每个订单只能评价一次';
  end if;

  insert into public.reviews (
    order_id,
    author_id,
    subject_id,
    rating,
    body,
    is_public
  )
  values (
    target_order.id,
    current_user_id,
    subject_user_id,
    rating_value,
    nullif(trim(coalesce(review_body, '')), ''),
    public_review
  )
  returning * into created_review;

  return created_review;
end;
$$;

revoke execute on function public.accept_order_delivery(uuid) from public, anon;
revoke execute on function public.reject_order_delivery(uuid, text) from public, anon;
revoke execute on function public.open_order_dispute(uuid, text, text) from public, anon;
revoke execute on function public.create_order_review(uuid, integer, text, boolean) from public, anon;
grant execute on function public.accept_order_delivery(uuid) to authenticated;
grant execute on function public.reject_order_delivery(uuid, text) to authenticated;
grant execute on function public.open_order_dispute(uuid, text, text) to authenticated;
grant execute on function public.create_order_review(uuid, integer, text, boolean) to authenticated;

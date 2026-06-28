-- AI 应用市场（现成 AI 产品）：开发者上架、平台审核后公开、买家购买后获取授权码/链接。
--
-- 设计要点：
-- * 商品公开信息放在 products，买家可见；交付密钥（授权码/链接）放在独立的
--   product_secrets，仅卖家本人可读写，公开查询不触碰。
-- * 购买与确认通过 security definer RPC 完成：确认付款时由数据库把卖家密钥快照
--   到 product_purchases.delivered_payload，买家只能读自己的购买记录。
-- * 第一阶段仍为模拟付款，不接真实资金。

create type public.product_status as enum (
  'draft', 'pending_review', 'published', 'rejected', 'delisted'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 4 and 120),
  summary text not null check (char_length(summary) between 4 and 200),
  description text not null check (char_length(description) >= 20),
  category text not null,
  price_cents bigint not null check (price_cents > 0),
  delivery_type text not null default 'license_or_link',
  status public.product_status not null default 'draft',
  review_notes text,
  is_suspended boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_published_idx
  on public.products (published_at desc)
  where status = 'published' and is_suspended = false;

-- 交付密钥与商品分表存放，避免在公开查询中暴露。
create table public.product_secrets (
  product_id uuid primary key references public.products(id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now()
);

create table public.product_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  amount_cents bigint not null check (amount_cents > 0),
  commission_bps integer not null default 1000 check (commission_bps between 0 and 10000),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'closed')),
  delivered_payload text,
  platform_purchase_no text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check (buyer_id <> seller_id)
);

create index product_purchases_buyer_idx
  on public.product_purchases (buyer_id, created_at desc);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger product_secrets_set_updated_at
  before update on public.product_secrets
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_secrets enable row level security;
alter table public.product_purchases enable row level security;

-- products：公开只读已发布且未下架的；卖家可读自己的全部。
create policy "anyone can read published products"
on public.products for select
to anon, authenticated
using (status = 'published' and is_suspended = false);

create policy "sellers can read own products"
on public.products for select
to authenticated
using (seller_id = auth.uid());

create policy "approved developers can create products"
on public.products for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.developer_profiles
    where developer_profiles.user_id = auth.uid()
      and developer_profiles.review_status = 'approved'
  )
);

-- 卖家只能修改自己尚未进入审核/发布的商品（草稿或被拒）。
-- 发布、下架、状态流转由服务端（service role）执行。
create policy "sellers can update own draft products"
on public.products for update
to authenticated
using (seller_id = auth.uid() and status in ('draft', 'rejected'))
with check (seller_id = auth.uid() and status in ('draft', 'pending_review'));

-- product_secrets：仅卖家本人可读写自己商品的密钥。
create policy "sellers manage own product secrets"
on public.product_secrets for all
to authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_secrets.product_id
      and products.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.products
    where products.id = product_secrets.product_id
      and products.seller_id = auth.uid()
  )
);

-- product_purchases：买卖双方可读自己的；写入只走 RPC。
create policy "purchase parties can read purchases"
on public.product_purchases for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

grant usage on type public.product_status to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;
grant select, insert, update, delete on public.product_secrets to authenticated;
grant select on public.product_purchases to authenticated;

-- ----------------------------------------------------------------------------
-- 购买与确认 RPC（security definer）
-- ----------------------------------------------------------------------------
create or replace function public.purchase_product(target_product_id uuid)
returns public.product_purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_product  public.products;
  created_purchase public.product_purchases;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into   target_product
  from   public.products
  where  id = target_product_id;

  if target_product.id is null then
    raise exception 'Product not found';
  end if;

  if target_product.status <> 'published' or target_product.is_suspended then
    raise exception 'Product is not available';
  end if;

  if target_product.seller_id = current_user_id then
    raise exception 'Sellers cannot buy their own product';
  end if;

  insert into public.product_purchases (
    product_id,
    buyer_id,
    seller_id,
    amount_cents,
    commission_bps,
    status,
    platform_purchase_no
  )
  values (
    target_product.id,
    current_user_id,
    target_product.seller_id,
    target_product.price_cents,
    1000,
    'pending_payment',
    'mock-purchase-' || gen_random_uuid()::text
  )
  returning * into created_purchase;

  return created_purchase;
end;
$$;

create or replace function public.confirm_product_purchase(purchase_id uuid)
returns public.product_purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_purchase  public.product_purchases;
  secret_payload   text;
  updated_purchase public.product_purchases;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into   target_purchase
  from   public.product_purchases
  where  id = purchase_id
  for update;

  if target_purchase.id is null then
    raise exception 'Purchase not found';
  end if;

  if target_purchase.buyer_id <> current_user_id then
    raise exception 'Only the buyer can confirm this purchase';
  end if;

  if target_purchase.status <> 'pending_payment' then
    raise exception 'Purchase is not pending payment';
  end if;

  select payload
  into   secret_payload
  from   public.product_secrets
  where  product_id = target_purchase.product_id;

  update public.product_purchases
  set    status = 'paid',
         paid_at = now(),
         delivered_payload = coalesce(secret_payload, '卖家尚未提供交付内容，请联系平台。')
  where  id = target_purchase.id
  returning * into updated_purchase;

  return updated_purchase;
end;
$$;

revoke execute on function public.purchase_product(uuid) from public, anon;
revoke execute on function public.confirm_product_purchase(uuid) from public, anon;
grant execute on function public.purchase_product(uuid) to authenticated;
grant execute on function public.confirm_product_purchase(uuid) to authenticated;

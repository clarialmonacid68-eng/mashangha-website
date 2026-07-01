-- Generated from supabase/migrations/*.sql
-- Regenerate after adding production migrations.

-- ============================================================================
-- supabase/migrations/202606150001_identity.sql
-- ============================================================================

create type public.app_role as enum ('customer', 'developer', 'admin');
create type public.review_status as enum ('draft', 'pending', 'approved', 'rejected');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  phone text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.developer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  skills text[] not null default '{}',
  hourly_rate_cents bigint check (hourly_rate_cents is null or hourly_rate_cents >= 0),
  review_status public.review_status not null default 'draft',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger developer_profiles_set_updated_at
before update on public.developer_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, new.phone, '用户'), '@', 1)),
    new.phone
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.apply_for_developer()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.developer_profiles (user_id, review_status)
  values (current_user_id, 'draft')
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (current_user_id, 'developer')
  on conflict (user_id, role) do nothing;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.developer_profiles enable row level security;

create policy "users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "users can read their roles"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

create policy "approved developer profiles are public"
on public.developer_profiles for select
to anon, authenticated
using (review_status = 'approved' or user_id = auth.uid());

create policy "developers can create their profile"
on public.developer_profiles for insert
to authenticated
with check (user_id = auth.uid() and review_status = 'draft');

create policy "developers can update unreviewed profile fields"
on public.developer_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and review_status in ('draft', 'pending'));

grant usage on type public.app_role, public.review_status to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.developer_profiles to anon, authenticated;
grant insert, update on public.developer_profiles to authenticated;
revoke execute on function public.apply_for_developer() from public, anon;
grant execute on function public.apply_for_developer() to authenticated;


-- ============================================================================
-- supabase/migrations/202606150002_marketplace.sql
-- ============================================================================

create type public.demand_status as enum (
  'draft', 'pending_review', 'published', 'matched', 'closed'
);
create type public.quote_status as enum (
  'active', 'selected', 'withdrawn', 'expired', 'rejected'
);

create table public.demands (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) >= 20),
  budget_min_cents bigint not null check (budget_min_cents >= 0),
  budget_max_cents bigint not null check (budget_max_cents >= budget_min_cents),
  expected_delivery_date date,
  status public.demand_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.demand_attachments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  developer_id uuid not null references public.profiles(id),
  amount_cents bigint not null check (amount_cents > 0),
  delivery_days integer not null check (delivery_days > 0),
  proposal text not null check (char_length(proposal) >= 20),
  status public.quote_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index quotes_one_live_per_developer
on public.quotes (demand_id, developer_id)
where status in ('active', 'selected');

create trigger demands_set_updated_at
before update on public.demands
for each row execute function public.set_updated_at();

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

alter table public.demands enable row level security;
alter table public.demand_attachments enable row level security;
alter table public.quotes enable row level security;

create policy "published demands are public"
on public.demands for select
to anon, authenticated
using (status = 'published' or customer_id = auth.uid());

create policy "customers can create their demands"
on public.demands for insert
to authenticated
with check (customer_id = auth.uid());

create policy "customers can update their demands"
on public.demands for update
to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

create policy "customers can delete draft demands"
on public.demands for delete
to authenticated
using (customer_id = auth.uid() and status = 'draft');

create policy "demand owners can read attachments"
on public.demand_attachments for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.demands
    where demands.id = demand_attachments.demand_id
      and demands.customer_id = auth.uid()
  )
);

create policy "customers can manage demand attachments"
on public.demand_attachments for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.demands
    where demands.id = demand_attachments.demand_id
      and demands.customer_id = auth.uid()
  )
);

create policy "quote parties can read quotes"
on public.quotes for select
to authenticated
using (
  developer_id = auth.uid()
  or exists (
    select 1 from public.demands
    where demands.id = quotes.demand_id
      and demands.customer_id = auth.uid()
  )
);

create policy "approved developers can create quotes"
on public.quotes for insert
to authenticated
with check (
  developer_id = auth.uid()
  and exists (
    select 1 from public.developer_profiles
    where developer_profiles.user_id = auth.uid()
      and developer_profiles.review_status = 'approved'
  )
  and exists (
    select 1 from public.demands
    where demands.id = quotes.demand_id
      and demands.status = 'published'
  )
);

create policy "developers can update their active quotes"
on public.quotes for update
to authenticated
using (developer_id = auth.uid() and status = 'active')
with check (developer_id = auth.uid());

grant usage on type public.demand_status, public.quote_status to anon, authenticated;
grant select on public.demands to anon, authenticated;
grant insert, update, delete on public.demands to authenticated;
grant select, insert, update, delete on public.demand_attachments to authenticated;
grant select, insert, update on public.quotes to authenticated;



-- ============================================================================
-- supabase/migrations/202606150003_orders.sql
-- ============================================================================

create type public.order_status as enum (
  'pending_payment', 'in_progress', 'delivered', 'accepted',
  'sharing', 'completed', 'closed', 'refund_review',
  'refunding', 'refunded', 'disputed', 'share_failed'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  developer_id uuid not null references public.profiles(id),
  demand_id uuid not null unique references public.demands(id),
  quote_id uuid unique references public.quotes(id),
  amount_cents bigint not null check (amount_cents > 0),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  status public.order_status not null default 'pending_payment',
  version bigint not null default 0 check (version >= 0),
  paid_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id <> developer_id)
);

create table public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  message_id uuid references public.order_messages(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id),
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  developer_id uuid not null references public.profiles(id),
  version integer not null check (version > 0),
  notes text not null,
  delivery_url text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, version)
);

create unique index deliveries_one_current_per_order
on public.deliveries (order_id)
where is_current;

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.supplement_orders (
  id uuid primary key default gen_random_uuid(),
  parent_order_id uuid not null references public.orders(id),
  child_order_id uuid not null unique references public.orders(id),
  created_at timestamptz not null default now(),
  check (parent_order_id <> child_order_id)
);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_messages_set_updated_at
before update on public.order_messages
for each row execute function public.set_updated_at();

create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_attachments enable row level security;
alter table public.deliveries enable row level security;
alter table public.order_status_history enable row level security;
alter table public.supplement_orders enable row level security;

create policy "order participants can read orders"
on public.orders for select
to authenticated
using (auth.uid() in (customer_id, developer_id));

create policy "order participants can read messages"
on public.order_messages for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_messages.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can create messages"
on public.order_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_messages.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can read attachments"
on public.order_attachments for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_attachments.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can create attachment metadata"
on public.order_attachments for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_attachments.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can read deliveries"
on public.deliveries for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = deliveries.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can read status history"
on public.order_status_history for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_status_history.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "order participants can read supplement links"
on public.supplement_orders for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id in (
      supplement_orders.parent_order_id,
      supplement_orders.child_order_id
    )
    and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

grant usage on type public.order_status to authenticated;
grant select on public.orders to authenticated;
grant select, insert on public.order_messages to authenticated;
grant select, insert on public.order_attachments to authenticated;
grant select on public.deliveries, public.order_status_history, public.supplement_orders to authenticated;



-- ============================================================================
-- supabase/migrations/202606150004_governance.sql
-- ============================================================================

create type public.payment_status as enum (
  'created', 'pending', 'succeeded', 'closed', 'failed'
);
create type public.refund_status as enum (
  'requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected'
);
create type public.share_status as enum (
  'pending', 'processing', 'succeeded', 'failed'
);
create type public.dispute_status as enum (
  'open', 'investigating', 'resolved_continue', 'resolved_accept', 'resolved_refund', 'closed'
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null,
  platform_payment_no text not null unique,
  provider_transaction_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  status public.payment_status not null default 'created',
  raw_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_one_success_per_order
on public.payments (order_id)
where status = 'succeeded';

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  payment_id uuid not null references public.payments(id),
  platform_refund_no text not null unique,
  provider_refund_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profit_shares (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  payment_id uuid not null references public.payments(id),
  platform_share_no text not null unique,
  developer_amount_cents bigint not null check (developer_amount_cents >= 0),
  commission_amount_cents bigint not null check (commission_amount_cents >= 0),
  status public.share_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  author_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  rating smallint not null check (rating between 1 and 5),
  body text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, author_id),
  check (author_id <> subject_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  opened_by uuid not null references public.profiles(id),
  reason text not null,
  requested_resolution text not null,
  status public.dispute_status not null default 'open',
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  storage_path text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger refunds_set_updated_at
before update on public.refunds
for each row execute function public.set_updated_at();

create trigger profit_shares_set_updated_at
before update on public.profit_shares
for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create trigger disputes_set_updated_at
before update on public.disputes
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.profit_shares enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.audit_logs enable row level security;

create policy "order participants can read reviews"
on public.reviews for select
to authenticated
using (
  is_public
  or author_id = auth.uid()
  or subject_id = auth.uid()
);

create policy "order participants can read disputes"
on public.disputes for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = disputes.order_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

create policy "dispute participants can read evidence"
on public.dispute_evidence for select
to authenticated
using (
  exists (
    select 1
    from public.disputes
    join public.orders on orders.id = disputes.order_id
    where disputes.id = dispute_evidence.dispute_id
      and auth.uid() in (orders.customer_id, orders.developer_id)
  )
);

grant usage on type
  public.payment_status,
  public.refund_status,
  public.share_status,
  public.dispute_status
to authenticated;
grant select on public.reviews, public.disputes, public.dispute_evidence to authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;


-- ============================================================================
-- supabase/migrations/202606160001_developer_applications.sql
-- ============================================================================

alter table public.developer_profiles
  add column display_name text,
  add column city text,
  add column service_scopes text[] not null default '{}',
  add column starting_price_cents bigint check (
    starting_price_cents is null or starting_price_cents >= 0
  ),
  add column portfolio_title text,
  add column portfolio_description text,
  add column portfolio_url text,
  add column portfolio_image_url text,
  add column contact text,
  add column payout_subject_type text check (
    payout_subject_type is null
    or payout_subject_type in ('individual', 'company')
  ),
  add column payout_subject_name text,
  add column rejection_reason text;

drop policy if exists "developers can update unreviewed profile fields"
on public.developer_profiles;

create policy "developers can update unreviewed profile fields"
on public.developer_profiles for update
to authenticated
using (
  user_id = auth.uid()
  and review_status in ('draft', 'pending', 'rejected')
)
with check (
  user_id = auth.uid()
  and review_status in ('draft', 'pending')
);


-- ============================================================================
-- supabase/migrations/202606160002_demand_lifecycle.sql
-- ============================================================================

alter table public.demands
  add column project_type text not null default 'other',
  add column expected_delivery_days integer check (
    expected_delivery_days is null or expected_delivery_days > 0
  ),
  add column cooperation_mode text not null default 'fixed_scope',
  add column review_notes text,
  add column matched_at timestamptz,
  add column closed_at timestamptz,
  add constraint demands_positive_budget check (
    budget_min_cents > 0 and budget_max_cents > 0
  ),
  add constraint demands_project_type_known check (
    project_type in ('ai_app', 'mini_program', 'website', 'automation', 'other')
  ),
  add constraint demands_cooperation_mode_known check (
    cooperation_mode in ('fixed_scope', 'hourly', 'consulting')
  );

drop policy if exists "customers can update their demands"
on public.demands;

create policy "customers can update draft demands"
on public.demands for update
to authenticated
using (customer_id = auth.uid() and status = 'draft')
with check (
  customer_id = auth.uid()
  and status in ('draft', 'pending_review')
);

create or replace function public.close_demand(demand_id uuid)
returns public.demands
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  closed_demand public.demands;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.demands
  set status = 'closed',
      closed_at = now()
  where id = demand_id
    and customer_id = current_user_id
    and status in ('published', 'matched')
  returning * into closed_demand;

  if closed_demand.id is null then
    raise exception 'Demand cannot be closed';
  end if;

  return closed_demand;
end;
$$;

revoke execute on function public.close_demand(uuid) from public, anon;
grant execute on function public.close_demand(uuid) to authenticated;


-- ============================================================================
-- supabase/migrations/202606160003_quote_selection.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606160004_mock_payments.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606160005_order_collaboration.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606160006_acceptance_disputes.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606160007_notifications.sql
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  event_key text not null,
  event_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, event_key)
);

alter table public.notifications enable row level security;

create policy "notification recipients can read notifications"
on public.notifications for select
to authenticated
using (recipient_id = auth.uid());

grant select on public.notifications to authenticated;
grant insert, update on public.notifications to service_role;


-- ============================================================================
-- supabase/migrations/202606170001_notification_service_select.sql
-- ============================================================================

grant select on public.notifications to service_role;


-- ============================================================================
-- supabase/migrations/202606170002_quote_status_write_guard.sql
-- ============================================================================

-- Restrict quote UPDATE policy so developers can only withdraw their own active quotes.
-- Previously the with check only verified ownership, allowing status to be set to any
-- value including 'selected' — bypassing the select_quote_for_order RPC entirely.
drop policy if exists "developers can update their active quotes" on public.quotes;

create policy "developers can withdraw their active quotes"
on public.quotes for update
to authenticated
using (developer_id = auth.uid() and status = 'active')
with check (developer_id = auth.uid() and status = 'withdrawn');


-- ============================================================================
-- supabase/migrations/202606170003_fix_select_quote_lock_order.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606170004_admin_governance_flags.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202606170005_select_quote_block_suspended.sql
-- ============================================================================

-- Harden select_quote_for_order: reject selection on suspended demands.
--
-- The admin "suspend demand" action hides a demand from the marketplace and
-- blocks new quotes in the UI, but the RPC previously only checked
-- status = 'published'. A caller holding a quote id could still create an
-- order on a published-but-suspended demand. This recreates the function with
-- an explicit is_suspended guard, keeping the demands-before-quotes lock order
-- introduced in 202606170003.
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

  -- Step 1: read demand_id without a lock (immutable after insert).
  select demand_id
  into   v_demand_id
  from   public.quotes
  where  id = quote_id;

  if v_demand_id is null then
    raise exception 'Quote not found';
  end if;

  -- Step 2: lock the demand row first (global lock order: demands -> quotes).
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

  if target_demand.is_suspended then
    raise exception 'Demand is suspended';
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


-- ============================================================================
-- supabase/migrations/202606170006_storage_order_files.sql
-- ============================================================================

-- Private storage bucket for order attachments and deliveries.
--
-- The bucket is private: no public read. Uploads use short-lived signed upload
-- URLs and downloads use short-lived signed URLs, both minted server-side by the
-- service role after the app has authorized the caller against the order (RLS on
-- public.order_attachments / public.orders). We deliberately do not add broad
-- storage.objects RLS policies for end users in phase one — all storage access
-- is brokered through authorized server routes.

insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', false)
on conflict (id) do nothing;


-- ============================================================================
-- supabase/migrations/202606170007_products.sql
-- ============================================================================

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


-- ============================================================================
-- supabase/migrations/202607010001_allow_digital_employee_demands.sql
-- ============================================================================

alter table public.demands
  drop constraint if exists demands_project_type_known;

alter table public.demands
  add constraint demands_project_type_known check (
    project_type in (
      'ai_app',
      'digital_employee',
      'mini_program',
      'website',
      'automation',
      'other'
    )
  );


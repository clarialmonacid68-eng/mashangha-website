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


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

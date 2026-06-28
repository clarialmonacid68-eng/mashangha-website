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


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

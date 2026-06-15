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

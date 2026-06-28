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

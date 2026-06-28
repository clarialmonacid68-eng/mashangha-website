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

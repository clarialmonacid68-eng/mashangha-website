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

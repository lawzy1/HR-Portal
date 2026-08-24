-- Phase 5: kpi_job_items, kpi_monthly, kpi_adjustments, ot_records.
--
-- kpi_job_items.employee_id is a required FK (not the prototype's fuzzy
-- assigneeName string match against employees.full_name) — job assignment
-- is admin-only write; employees read their own assigned jobs.
--
-- ot_records: employee can self-register (INSERT own), only admin can
-- approve/reject (UPDATE status) — same self-insert/admin-approve shape as
-- leave_requests in Phase 4.
--
-- Formulas (OT rate, OT %, KPI bonus) are NOT hard-coded here — they read
-- from company_settings (kpi_rate_per_day, ot_weekday_percent,
-- ot_weekend_percent, kpi_bonus_per_point, kpi_bonus_min), already added
-- in the Phase 1 foundation migration as configurable defaults.
--
-- Verified live: authenticated + service_role both have full grants on all
-- four tables immediately (information_schema check) — no repeat of the
-- Phase 2/create-employee missing-grant bug.

create table if not exists public.kpi_job_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  order_job text not null,
  sub_task text,
  parent_task text,
  views_count numeric,
  converted_kpi numeric,
  duration_days numeric,
  deadline text,
  month integer not null,
  year integer not null,
  created_at timestamptz not null default now()
);

create index if not exists kpi_job_items_employee_id_idx on public.kpi_job_items(employee_id);
create index if not exists kpi_job_items_company_id_idx on public.kpi_job_items(company_id);

create table if not exists public.kpi_monthly (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month integer not null,
  year integer not null,
  rendered_views_actual numeric,
  kpi_converted_views numeric,
  kpi_target numeric,
  completion_percentage numeric,
  ot_hours numeric,
  ot_hourly_rate numeric,
  bonus_amount numeric,
  benefit_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, month, year)
);

create index if not exists kpi_monthly_company_id_idx on public.kpi_monthly(company_id);

create table if not exists public.kpi_adjustments (
  id uuid primary key default gen_random_uuid(),
  kpi_monthly_id uuid not null references public.kpi_monthly(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  title text not null,
  amount numeric not null,
  reason text
);

create index if not exists kpi_adjustments_kpi_monthly_id_idx on public.kpi_adjustments(kpi_monthly_id);

create table if not exists public.ot_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  hours numeric not null,
  views_render_count numeric,
  reason text,
  approver_id uuid references public.profiles(id) on delete set null,
  pay_type text,
  ot_percentage numeric,
  status text not null default 'Chờ duyệt',
  amount numeric,
  created_at timestamptz not null default now()
);

create index if not exists ot_records_employee_id_idx on public.ot_records(employee_id);
create index if not exists ot_records_company_id_idx on public.ot_records(company_id);

alter table public.kpi_job_items enable row level security;
alter table public.kpi_monthly enable row level security;
alter table public.kpi_adjustments enable row level security;
alter table public.ot_records enable row level security;

drop policy if exists "kpi_job_items_select_self_or_admin" on public.kpi_job_items;
create policy "kpi_job_items_select_self_or_admin" on public.kpi_job_items
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "kpi_job_items_write_admin_only" on public.kpi_job_items;
create policy "kpi_job_items_write_admin_only" on public.kpi_job_items
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "kpi_monthly_select_self_or_admin" on public.kpi_monthly;
create policy "kpi_monthly_select_self_or_admin" on public.kpi_monthly
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "kpi_monthly_write_admin_only" on public.kpi_monthly;
create policy "kpi_monthly_write_admin_only" on public.kpi_monthly
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "kpi_adjustments_select_self_or_admin" on public.kpi_adjustments;
create policy "kpi_adjustments_select_self_or_admin" on public.kpi_adjustments
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or exists (
      select 1 from public.kpi_monthly km
      where km.id = kpi_adjustments.kpi_monthly_id and km.employee_id = public.current_employee_id()
    ))
  );

drop policy if exists "kpi_adjustments_write_admin_only" on public.kpi_adjustments;
create policy "kpi_adjustments_write_admin_only" on public.kpi_adjustments
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "ot_records_select_self_or_admin" on public.ot_records;
create policy "ot_records_select_self_or_admin" on public.ot_records
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "ot_records_insert_self_or_admin" on public.ot_records;
create policy "ot_records_insert_self_or_admin" on public.ot_records
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "ot_records_update_admin_only" on public.ot_records;
create policy "ot_records_update_admin_only" on public.ot_records
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select, insert, update, delete on public.kpi_job_items to authenticated;
grant select, insert, update, delete on public.kpi_monthly to authenticated;
grant select, insert, update, delete on public.kpi_adjustments to authenticated;
grant select, insert, update, delete on public.ot_records to authenticated;

grant all on public.kpi_job_items, public.kpi_monthly, public.kpi_adjustments, public.ot_records to service_role;

-- Persist an optional standard-workday override per company and payroll/KPI
-- period. A company setting would rewrite historical months, so the period
-- is part of the row's natural key.

create table if not exists public.company_workday_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  standard_work_days numeric not null check (standard_work_days > 0 and standard_work_days <= 31),
  created_at timestamptz not null default now(),
  unique (company_id, month, year)
);

alter table public.company_workday_overrides enable row level security;

revoke all on table public.company_workday_overrides from anon, authenticated;
grant select, insert, update, delete on table public.company_workday_overrides to authenticated;
grant all on table public.company_workday_overrides to service_role;

create policy "company_workday_overrides_select_own_company"
  on public.company_workday_overrides for select to authenticated
  using (company_id = (select public.current_company_id()));

create policy "company_workday_overrides_insert_backoffice"
  on public.company_workday_overrides for insert to authenticated
  with check (
    company_id = (select public.current_company_id())
    and (select public.is_backoffice())
  );

create policy "company_workday_overrides_update_backoffice"
  on public.company_workday_overrides for update to authenticated
  using (
    company_id = (select public.current_company_id())
    and (select public.is_backoffice())
  )
  with check (
    company_id = (select public.current_company_id())
    and (select public.is_backoffice())
  );

create policy "company_workday_overrides_delete_backoffice"
  on public.company_workday_overrides for delete to authenticated
  using (
    company_id = (select public.current_company_id())
    and (select public.is_backoffice())
  );

-- Once KPI is submitted for final approval or published, its standard-day
-- input is immutable. This protects the KPI target/OT snapshot from a direct
-- Data API write that bypasses the frontend's disabled edit icon.
create or replace function public.guard_company_workday_override_kpi_lock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid := coalesce(new.company_id, old.company_id);
  v_month integer := coalesce(new.month, old.month);
  v_year integer := coalesce(new.year, old.year);
begin
  if exists (
    select 1
    from public.kpi_monthly km
    where km.company_id = v_company_id
      and km.month = v_month
      and km.year = v_year
      and km.publish_status in ('pending_approval', 'published')
  ) then
    raise exception 'KPI tháng đang chờ duyệt hoặc đã phát hành nên không thể đổi ngày công chuẩn.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_company_workday_override_kpi_lock on public.company_workday_overrides;
create trigger guard_company_workday_override_kpi_lock
  before insert or update or delete on public.company_workday_overrides
  for each row execute function public.guard_company_workday_override_kpi_lock();

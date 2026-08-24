-- Phase 4: leave_requests, leave_balances, company_holidays.
--
-- leave_balances.used_days/pending_days are trigger-maintained from
-- leave_requests (never client-writable directly) so they can't drift from
-- the source of truth like the prototype's client-side recompute could.
-- remaining_days is a generated column so it's always consistent by
-- construction. total_accumulated is the one field Admin edits directly
-- (matches the meeting note: "Admin phải edit được ngày phép — công ty
-- thưởng thêm ngày").
--
-- Verified live (temp employee + 2 leave_requests inserted and rolled back
-- in one transaction): used_days=2, pending_days=1, remaining_days=9 off a
-- default total_accumulated=12 — matches expectations exactly.

create table if not exists public.company_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date date not null,
  name text not null,
  unique (company_id, date)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  total_days numeric not null,
  half_day_option text not null default 'Cả ngày',
  reason text,
  status text not null default 'Chờ duyệt',
  created_at timestamptz not null default now(),
  approver_id uuid references public.profiles(id) on delete set null,
  approver_comment text
);

create index if not exists leave_requests_employee_id_idx on public.leave_requests(employee_id);
create index if not exists leave_requests_company_id_idx on public.leave_requests(company_id);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  total_accumulated numeric not null default 12,
  used_days numeric not null default 0,
  pending_days numeric not null default 0,
  remaining_days numeric generated always as (total_accumulated - used_days - pending_days) stored,
  expiry_date date,
  unique (employee_id, year)
);

create index if not exists leave_balances_company_id_idx on public.leave_balances(company_id);

-- ===== Keep used_days/pending_days in sync with leave_requests =====
create or replace function public.recompute_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_company_id uuid;
  v_year integer;
begin
  v_employee_id := coalesce(new.employee_id, old.employee_id);
  v_company_id := coalesce(new.company_id, old.company_id);
  v_year := extract(year from coalesce(new.start_date, old.start_date));

  insert into public.leave_balances (company_id, employee_id, year)
  values (v_company_id, v_employee_id, v_year)
  on conflict (employee_id, year) do nothing;

  update public.leave_balances lb
  set
    used_days = coalesce((
      select sum(lr.total_days) from public.leave_requests lr
      where lr.employee_id = v_employee_id
        and lr.status = 'Đã duyệt'
        and extract(year from lr.start_date) = v_year
    ), 0),
    pending_days = coalesce((
      select sum(lr.total_days) from public.leave_requests lr
      where lr.employee_id = v_employee_id
        and lr.status = 'Chờ duyệt'
        and extract(year from lr.start_date) = v_year
    ), 0)
  where lb.employee_id = v_employee_id and lb.year = v_year;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_leave_balance on public.leave_requests;
create trigger trg_recompute_leave_balance
  after insert or update or delete on public.leave_requests
  for each row
  execute function public.recompute_leave_balance();

-- Auto-create a default leave_balances row when an employee is created, so
-- the FE never has to handle "no row yet" for a brand new hire.
create or replace function public.create_default_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leave_balances (company_id, employee_id, year, total_accumulated, expiry_date)
  values (new.company_id, new.id, extract(year from now())::integer, 12, make_date(extract(year from now())::integer, 12, 31))
  on conflict (employee_id, year) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_default_leave_balance on public.employees;
create trigger trg_create_default_leave_balance
  after insert on public.employees
  for each row
  execute function public.create_default_leave_balance();

-- ===== RLS =====
alter table public.company_holidays enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_balances enable row level security;

drop policy if exists "company_holidays_select_own_company" on public.company_holidays;
create policy "company_holidays_select_own_company" on public.company_holidays
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists "company_holidays_write_admin_only" on public.company_holidays;
create policy "company_holidays_write_admin_only" on public.company_holidays
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "leave_requests_select_self_or_admin" on public.leave_requests;
create policy "leave_requests_select_self_or_admin" on public.leave_requests
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "leave_requests_insert_self_or_admin" on public.leave_requests;
create policy "leave_requests_insert_self_or_admin" on public.leave_requests
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

-- Only admin approves/rejects (updates status/comment). Employees cannot
-- self-approve — this is the exact demo bug (self-approve buttons in the
-- prototype's own leave table) the rebuild is required to close.
drop policy if exists "leave_requests_update_admin_only" on public.leave_requests;
create policy "leave_requests_update_admin_only" on public.leave_requests
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "leave_balances_select_self_or_admin" on public.leave_balances;
create policy "leave_balances_select_self_or_admin" on public.leave_balances
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "leave_balances_write_admin_only" on public.leave_balances;
create policy "leave_balances_write_admin_only" on public.leave_balances
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select on public.company_holidays to authenticated;
grant insert, update, delete on public.company_holidays to authenticated;
grant select, insert on public.leave_requests to authenticated;
grant update on public.leave_requests to authenticated;
grant select, update on public.leave_balances to authenticated;

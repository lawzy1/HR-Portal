-- Phase 2: employees, employee_sensitive_info, employee_relatives.
--
-- Design decision: per BRD Mục 1 ("Employee Self-Service: tự TRA CỨU hồ sơ"),
-- employees are read-only on their own record in v1 — only Admin/HR writes.
-- The prototype's EditProfileModal let a logged-in employee edit their own
-- job_title/department/salary via the client, which is exactly the kind of
-- privilege-escalation surface Mục 5 of the BRD calls out to close. This is
-- a v1 default, easy to loosen later (e.g. self-edit of just phone/address)
-- once real business rules are confirmed — not a hard architectural wall.
--
-- Deletion: no DELETE policy/grant at all. "Delete employee" in the UI must
-- become a soft-delete (status = 'Đã nghỉ việc'), matching the BRD's
-- offboarding/PDPL requirements instead of the prototype's hard delete.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_code text not null,
  full_name text not null,
  job_title text,
  department text,
  avatar_url text,
  dob date,
  gender text,
  marital_status text,
  phone text,
  email text,
  permanent_address text,
  temporary_address text,
  start_date date,
  contract_type text,
  current_salary numeric,
  last_salary_review_date date,
  status text not null default 'Mới tiếp nhận',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_code)
);

create index if not exists employees_company_id_idx on public.employees(company_id);

-- Now that `employees` exists, wire up the FK profiles.employee_id was left
-- dangling for in the Phase 1 migration.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_employee_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_employee_id_fkey
      foreign key (employee_id) references public.employees(id) on delete set null;
  end if;
end $$;

-- 1:1 with employees. Split out from `employees` so the most sensitive
-- columns (CCCD, tax code, bank info) live behind their own RLS surface
-- instead of being mixed into the general profile row.
create table if not exists public.employee_sensitive_info (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  id_card_number text,
  id_card_issue_date date,
  id_card_issue_place text,
  id_card_front_url text,
  id_card_back_url text,
  vneid_residency_url text,
  tax_code text,
  social_insurance_code text,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  bank_branch text,
  updated_at timestamptz not null default now()
);

create index if not exists employee_sensitive_info_company_id_idx on public.employee_sensitive_info(company_id);

create table if not exists public.employee_relatives (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text,
  address text,
  is_emergency_contact boolean not null default false
);

create index if not exists employee_relatives_employee_id_idx on public.employee_relatives(employee_id);

-- ===== Helper: which employee row (if any) does the caller correspond to =====
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid()
$$;

-- ===== RLS =====
alter table public.employees enable row level security;
alter table public.employee_sensitive_info enable row level security;
alter table public.employee_relatives enable row level security;

drop policy if exists "employees_select_self_or_admin" on public.employees;
create policy "employees_select_self_or_admin" on public.employees
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or id = public.current_employee_id())
  );

drop policy if exists "employees_write_admin_only" on public.employees;
create policy "employees_write_admin_only" on public.employees
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id()
  );

drop policy if exists "employee_sensitive_select_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_select_self_or_admin" on public.employee_sensitive_info
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "employee_sensitive_write_admin_only" on public.employee_sensitive_info;
create policy "employee_sensitive_write_admin_only" on public.employee_sensitive_info
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id()
  );

drop policy if exists "employee_relatives_select_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_select_self_or_admin" on public.employee_relatives
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "employee_relatives_write_admin_only" on public.employee_relatives;
create policy "employee_relatives_write_admin_only" on public.employee_relatives
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id()
  );

-- ===== Data API grants (learned from Phase 1: RLS alone isn't enough) =====
grant select, update on public.employees to authenticated;
grant select, update on public.employee_sensitive_info to authenticated;
grant select, insert, update, delete on public.employee_relatives to authenticated;

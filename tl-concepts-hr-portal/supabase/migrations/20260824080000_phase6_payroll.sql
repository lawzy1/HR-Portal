-- Phase 6: payroll_records.
--
-- Reduced scope as agreed: this table does NOT auto-pull kpi_bonus/ot_pay
-- from kpi_monthly/ot_records — Admin enters those two figures directly per
-- payslip line, same as base_salary. Only the insurance/tax math stays
-- formula-driven (from company_settings), consistent with the Phase 5
-- "no hard-coded formulas" rule.
--
-- Two settings this table's formula depends on that company_settings didn't
-- have yet are added here: family_deduction (giảm trừ gia cảnh) and
-- personal_income_tax_rate (flat-rate placeholder, not a real progressive
-- PIT bracket — matches the simplified prototype math).
--
-- Employee: read-only on own payslips. Admin: full read/write on the whole
-- company. GRANT to both authenticated and service_role from the start —
-- lesson learned from the Phase 2 create-employee and Phase 5 first-pass
-- bugs where service_role was missing and Edge Functions got silently
-- blocked by RLS with no grant at all.

alter table public.company_settings
  add column if not exists family_deduction numeric not null default 11000000,
  add column if not exists personal_income_tax_rate numeric not null default 10;

create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month integer not null,
  year integer not null,
  base_salary numeric not null default 0,
  standard_work_days numeric not null default 0,
  actual_work_days numeric not null default 0,
  phone_allowance numeric not null default 0,
  lunch_allowance numeric not null default 0,
  kpi_bonus numeric not null default 0,
  ot_hours numeric not null default 0,
  ot_pay numeric not null default 0,
  project_bonus_amount numeric not null default 0,
  prior_month_adjustment numeric not null default 0,
  gross_income numeric not null default 0,
  bhxh_deduction numeric not null default 0,
  bhyt_deduction numeric not null default 0,
  bhtn_deduction numeric not null default 0,
  family_deduction numeric not null default 0,
  tax_exempt_income numeric not null default 0,
  taxable_income numeric not null default 0,
  personal_income_tax numeric not null default 0,
  advance_payment numeric not null default 0,
  other_deductions numeric not null default 0,
  net_salary numeric not null default 0,
  payment_status text not null default 'Chờ thanh toán',
  payment_date date,
  note text,
  created_at timestamptz not null default now(),
  unique (employee_id, month, year)
);

create index if not exists payroll_records_employee_id_idx on public.payroll_records(employee_id);
create index if not exists payroll_records_company_id_idx on public.payroll_records(company_id);

alter table public.payroll_records enable row level security;

drop policy if exists "payroll_records_select_self_or_admin" on public.payroll_records;
create policy "payroll_records_select_self_or_admin" on public.payroll_records
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "payroll_records_write_admin_only" on public.payroll_records;
create policy "payroll_records_write_admin_only" on public.payroll_records
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select, insert, update, delete on public.payroll_records to authenticated;
grant all on public.payroll_records to service_role;

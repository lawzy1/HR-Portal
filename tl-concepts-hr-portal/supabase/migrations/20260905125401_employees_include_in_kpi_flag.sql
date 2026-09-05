-- Lets Admin/HR exclude specific employees (e.g. backoffice/admin accounts
-- that don't do billable design work) from monthly KPI draft generation,
-- without hiding them from the standard-KPI table itself.
alter table public.employees
  add column if not exists include_in_kpi boolean not null default true;

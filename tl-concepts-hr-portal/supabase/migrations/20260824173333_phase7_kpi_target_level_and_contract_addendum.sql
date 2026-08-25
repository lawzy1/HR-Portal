-- Per-employee KPI level & target/day (drives monthly KPI quota calc),
-- contract addendum linkage + extra terms, and job-item category
-- (New Render vs Re Process) for the KPI progress breakdown.

alter table public.employees
  add column if not exists kpi_level text,
  add column if not exists kpi_target_per_day numeric;

alter table public.contracts
  add column if not exists signed_date date,
  add column if not exists kpi_target_month numeric,
  add column if not exists allowance_amount numeric not null default 0,
  add column if not exists parent_contract_id uuid references public.contracts(id) on delete set null;

create index if not exists contracts_parent_contract_id_idx
  on public.contracts(parent_contract_id);

alter table public.kpi_job_items
  add column if not exists category text not null default 'new_render';

alter table public.kpi_job_items drop constraint if exists kpi_job_items_category_check;
alter table public.kpi_job_items
  add constraint kpi_job_items_category_check check (category in ('new_render', 'reprocess'));

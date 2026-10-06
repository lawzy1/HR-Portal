-- Template "Bảng lương" columns + per-payslip custom lines (thu nhập / khấu trừ /
-- điều chỉnh) that live only on that month's record.
alter table public.payroll_records
  add column if not exists policy_leave_days numeric not null default 0,
  add column if not exists paid_work_days numeric not null default 0,
  add column if not exists custom_items jsonb not null default '[]'::jsonb;

alter table public.payroll_records
  add constraint payroll_records_custom_items_is_array check (jsonb_typeof(custom_items) = 'array');

create or replace function public.payroll_custom_total(p_items jsonb, p_section text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum((item ->> 'amount')::numeric), 0)
  from jsonb_array_elements(p_items) as item
  where item ->> 'section' = p_section;
$$;

alter table public.payroll_records
  drop column if exists total_deductions,
  drop column if exists total_adjustments;

alter table public.payroll_records
  add column total_deductions numeric generated always as (
    bhxh_deduction + bhyt_deduction + bhtn_deduction
    + personal_income_tax + advance_payment + other_deductions
    + public.payroll_custom_total(custom_items, 'deduction')
  ) stored,
  add column total_adjustments numeric generated always as (
    welfare_refund + business_trip_refund + personal_income_tax_refund
    + prior_month_adjustment
    + public.payroll_custom_total(custom_items, 'adjustment')
  ) stored;

-- family_deduction and taxable_income are now supplied by the client
-- (defaults from company_settings, editable by Accounting). gross_income
-- already includes custom income lines; net adds custom deductions/adjustments.
create or replace function public.calculate_payroll_final_net()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.net_salary := new.gross_income
    - (
      new.bhxh_deduction + new.bhyt_deduction + new.bhtn_deduction
      + new.personal_income_tax + new.advance_payment + new.other_deductions
      + public.payroll_custom_total(new.custom_items, 'deduction')
    )
    + (
      new.welfare_refund + new.business_trip_refund + new.personal_income_tax_refund
      + new.prior_month_adjustment
      + public.payroll_custom_total(new.custom_items, 'adjustment')
    );
  return new;
end;
$$;

drop trigger if exists calculate_payroll_final_net on public.payroll_records;
create trigger calculate_payroll_final_net
  before insert or update of
    gross_income, bhxh_deduction, bhyt_deduction, bhtn_deduction,
    personal_income_tax, advance_payment, other_deductions,
    welfare_refund, business_trip_refund, personal_income_tax_refund,
    prior_month_adjustment, net_salary, custom_items
  on public.payroll_records
  for each row execute function public.calculate_payroll_final_net();

revoke all on function public.calculate_payroll_final_net() from public, anon, authenticated;

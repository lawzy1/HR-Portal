-- taxable_income is now supplied by the client (Excel column, or auto-calculated
-- in the portal and editable by Accounting). The trigger no longer overwrites it.
create or replace function public.calculate_payroll_final_net()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_self_deduction numeric;
  v_dependent_deduction numeric;
begin
  select cs.family_deduction, cs.dependent_deduction
  into v_self_deduction, v_dependent_deduction
  from public.company_settings cs
  where cs.company_id = new.company_id;

  v_self_deduction := coalesce(v_self_deduction, 15500000);
  v_dependent_deduction := coalesce(v_dependent_deduction, 6200000);
  new.family_deduction := v_self_deduction
    + (coalesce(new.dependents_count, 0) * v_dependent_deduction);

  new.net_salary := new.gross_income
    - (
      new.bhxh_deduction + new.bhyt_deduction + new.bhtn_deduction
      + new.personal_income_tax + new.advance_payment + new.other_deductions
    )
    + (
      new.welfare_refund + new.business_trip_refund + new.personal_income_tax_refund
      + new.prior_month_adjustment
    );
  return new;
end;
$$;

revoke all on function public.calculate_payroll_final_net() from public, anon, authenticated;

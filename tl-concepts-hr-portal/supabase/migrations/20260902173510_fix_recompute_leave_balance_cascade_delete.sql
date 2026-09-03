
-- recompute_leave_balance() fires AFTER DELETE on leave_requests, including
-- when the delete comes from CASCADE-deleting an employees row. In that case
-- the employee no longer exists, so its insert into leave_balances violates
-- leave_balances_employee_id_fkey and aborts the whole employee delete.
-- Skip the recompute when the employee is gone.
create or replace function public.recompute_leave_balance()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_employee_id uuid;
  v_company_id uuid;
  v_year integer;
begin
  v_employee_id := coalesce(new.employee_id, old.employee_id);
  v_company_id := coalesce(new.company_id, old.company_id);
  v_year := extract(year from coalesce(new.start_date, old.start_date));

  if not exists (select 1 from public.employees where id = v_employee_id) then
    return coalesce(new, old);
  end if;

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
$function$;
;

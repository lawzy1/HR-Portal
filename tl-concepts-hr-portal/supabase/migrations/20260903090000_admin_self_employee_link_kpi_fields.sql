-- Extends link_self_employee_profile with the KPI-config columns
-- (kpi_level, kpi_target_per_day, performance_commission_rate,
-- qc_commission_rate, guaranteed_income_amount) so an admin/hr account that
-- links itself to an employees record shows up fully configured in the
-- KPI/OT assignment screen, not just by name.

drop function if exists public.link_self_employee_profile(text, text, text);

create or replace function public.link_self_employee_profile(
  p_full_name text,
  p_job_title text,
  p_department text,
  p_kpi_level text default null,
  p_kpi_target_per_day numeric default null,
  p_performance_commission_rate numeric default 0,
  p_qc_commission_rate numeric default 0,
  p_guaranteed_income_amount numeric default 0
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_role text;
  v_existing_employee_id uuid;
  v_employee public.employees;
begin
  select company_id, role, employee_id
  into v_company_id, v_role, v_existing_employee_id
  from public.profiles
  where id = auth.uid();

  if v_role not in ('admin', 'hr') then
    raise exception 'Chỉ Admin hoặc HR mới dùng được chức năng này';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Thiếu họ tên';
  end if;

  if v_existing_employee_id is not null then
    update public.employees
    set full_name = trim(p_full_name),
        job_title = nullif(trim(p_job_title), ''),
        department = nullif(trim(p_department), ''),
        kpi_level = nullif(trim(p_kpi_level), ''),
        kpi_target_per_day = p_kpi_target_per_day,
        performance_commission_rate = coalesce(p_performance_commission_rate, 0),
        qc_commission_rate = coalesce(p_qc_commission_rate, 0),
        guaranteed_income_amount = coalesce(p_guaranteed_income_amount, 0)
    where id = v_existing_employee_id
    returning * into v_employee;
    return v_employee;
  end if;

  insert into public.employees (
    company_id, employee_code, full_name, job_title, department, status,
    kpi_level, kpi_target_per_day, performance_commission_rate, qc_commission_rate, guaranteed_income_amount
  ) values (
    v_company_id,
    'QL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(p_full_name),
    nullif(trim(p_job_title), ''),
    nullif(trim(p_department), ''),
    'Chính thức',
    nullif(trim(p_kpi_level), ''),
    p_kpi_target_per_day,
    coalesce(p_performance_commission_rate, 0),
    coalesce(p_qc_commission_rate, 0),
    coalesce(p_guaranteed_income_amount, 0)
  )
  returning * into v_employee;

  update public.profiles set employee_id = v_employee.id where id = auth.uid();

  return v_employee;
end;
$$;

grant execute on function public.link_self_employee_profile(text, text, text, text, numeric, numeric, numeric, numeric) to authenticated;

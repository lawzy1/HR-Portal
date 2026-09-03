-- Lets an admin/hr account link itself to a lightweight employees record
-- (name + job title/department only) so it shows up in KPI assignment,
-- without going through the full invitation/onboarding flow and without
-- leave/payroll fields being required. Mirrors the create_employee_invitation
-- pattern in 20260825100000_invitation_first_employee_onboarding.sql.

create or replace function public.link_self_employee_profile(
  p_full_name text,
  p_job_title text,
  p_department text
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
        department = nullif(trim(p_department), '')
    where id = v_existing_employee_id
    returning * into v_employee;
    return v_employee;
  end if;

  insert into public.employees (company_id, employee_code, full_name, job_title, department, status)
  values (
    v_company_id,
    'QL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(p_full_name),
    nullif(trim(p_job_title), ''),
    nullif(trim(p_department), ''),
    'Chính thức'
  )
  returning * into v_employee;

  update public.profiles set employee_id = v_employee.id where id = auth.uid();

  return v_employee;
end;
$$;

grant execute on function public.link_self_employee_profile(text, text, text) to authenticated;
;

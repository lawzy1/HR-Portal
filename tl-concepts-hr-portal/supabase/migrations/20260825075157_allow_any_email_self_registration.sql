-- Development self-registration accepts any valid email address. Accounts
-- remain inactive until an admin reviews the onboarding profile.

create or replace function public.handle_employee_self_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_full_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'employee_self' then
    return new;
  end if;

  if new.email is null then
    raise exception 'Email là bắt buộc';
  end if;

  select id into v_company_id
  from public.companies
  where registration_slug = 'tl-concepts';

  if v_company_id is null then
    raise exception 'Chưa cấu hình công ty cho luồng đăng ký';
  end if;

  v_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_full_name is null then
    raise exception 'Họ và tên là bắt buộc';
  end if;

  insert into public.employees (
    company_id,
    employee_code,
    full_name,
    email,
    phone,
    status
  ) values (
    v_company_id,
    'REG-' || upper(substr(new.id::text, 1, 8)),
    v_full_name,
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'Chờ duyệt'
  )
  returning id into v_employee_id;

  insert into public.profiles (id, company_id, employee_id, role, is_active)
  values (new.id, v_company_id, v_employee_id, 'employee', false);

  return new;
end;
$$;

revoke execute on function public.handle_employee_self_registration() from public, anon, authenticated;

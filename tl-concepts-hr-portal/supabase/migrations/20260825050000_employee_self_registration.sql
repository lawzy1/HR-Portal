-- Self-registration for TL Concepts employees.
-- New accounts are mapped to a pending employee/profile immediately, but
-- remain inactive until an admin reviews the onboarding documents.

alter table public.companies
  add column if not exists registration_slug text unique;

-- ponytail: this deployment currently has one company; introduce a company
-- chooser/invite code only when the product actually becomes multi-tenant.
update public.companies
set registration_slug = 'tl-concepts'
where id = (select id from public.companies order by created_at asc limit 1)
  and registration_slug is null;

create or replace function public.handle_employee_self_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_full_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'employee_self' then
    return new;
  end if;

  if split_part(lower(new.email), '@', 2) <> 'tlconceptsltd.com' then
    raise exception 'Vui lòng đăng ký bằng email @tlconceptsltd.com';
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

drop trigger if exists on_auth_user_employee_self_registration on auth.users;
create trigger on_auth_user_employee_self_registration
  after insert on auth.users
  for each row execute function public.handle_employee_self_registration();

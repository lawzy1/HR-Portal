-- Reverses the Phase 2 "admin-only write" default: employees now self-onboard
-- (fill their own personal info, upload CCCD/MST/bank info) instead of HR
-- entering everything on their behalf. Structural/employment facts
-- (job_title, department, salary, status, contract_type, employee_code,
-- full_name, email, start_date, last_salary_review_date) stay admin-only —
-- RLS alone can't express "self can edit some columns, not others" on one
-- table (it's row-level, not column-level), so a trigger enforces the
-- column split for non-admin callers.

create or replace function public.enforce_employee_self_edit_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.employee_code is distinct from old.employee_code
     or new.full_name is distinct from old.full_name
     or new.email is distinct from old.email
     or new.job_title is distinct from old.job_title
     or new.department is distinct from old.department
     or new.start_date is distinct from old.start_date
     or new.contract_type is distinct from old.contract_type
     or new.current_salary is distinct from old.current_salary
     or new.last_salary_review_date is distinct from old.last_salary_review_date
     or new.status is distinct from old.status
     or new.company_id is distinct from old.company_id
  then
    raise exception 'Chỉ Admin/HR mới được sửa chức danh, phòng ban, lương, trạng thái, hợp đồng, mã NV, họ tên hoặc email.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_employee_self_edit_columns on public.employees;
create trigger trg_enforce_employee_self_edit_columns
  before update on public.employees
  for each row
  execute function public.enforce_employee_self_edit_columns();

drop policy if exists "employees_write_admin_only" on public.employees;
create policy "employees_write_self_or_admin" on public.employees
  for update to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or id = public.current_employee_id())
  ) with check (
    company_id = public.current_company_id()
  );

-- employee_sensitive_info (CCCD, MST, bank info) and employee_relatives are
-- exactly what the employee is expected to self-fill — no column split
-- needed, the whole row is theirs to manage.

drop policy if exists "employee_sensitive_write_admin_only" on public.employee_sensitive_info;
create policy "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info
  for update to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  ) with check (
    company_id = public.current_company_id()
  );

drop policy if exists "employee_relatives_write_admin_only" on public.employee_relatives;
create policy "employee_relatives_write_self_or_admin" on public.employee_relatives
  for all to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  ) with check (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

-- Storage: employees can now upload into their own folder, not just admin.
drop policy if exists "employee_documents_write_admin_only" on storage.objects;
create policy "employee_documents_write_self_or_admin" on storage.objects
  for all to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = public.current_employee_id()::text
    )
  ) with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = public.current_employee_id()::text
    )
  );

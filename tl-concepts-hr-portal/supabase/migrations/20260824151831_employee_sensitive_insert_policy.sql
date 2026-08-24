-- Upsert needs INSERT permission when the employee does not have a sensitive-info row yet.

drop policy if exists "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

grant insert on public.employee_sensitive_info to authenticated;

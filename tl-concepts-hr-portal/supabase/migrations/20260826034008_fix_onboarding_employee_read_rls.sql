-- Inactive invited users intentionally receive NULL from current_company_id().
-- Phase 8 accidentally placed that active-account condition around the
-- onboarding exception too, so an in-progress invite could not read its own
-- employee row. Keep the normal company boundary and add a separately scoped
-- exception for only the invitation's employee/company pair.

drop policy if exists "employees_select_self_or_backoffice" on public.employees;
create policy "employees_select_self_or_backoffice" on public.employees
  for select to authenticated using (
    (
      company_id = (select public.current_company_id())
      and (
        (select public.is_backoffice())
        or id = (select public.current_employee_id())
      )
    )
    or (
      id = (select public.current_onboarding_employee_id())
      and company_id = (
        select p.company_id from public.profiles p where p.id = (select auth.uid())
      )
    )
  );

drop policy if exists "employee_sensitive_select_self_or_backoffice" on public.employee_sensitive_info;
create policy "employee_sensitive_select_self_or_backoffice" on public.employee_sensitive_info
  for select to authenticated using (
    (
      company_id = (select public.current_company_id())
      and (
        (select public.is_backoffice())
        or employee_id = (select public.current_employee_id())
      )
    )
    or (
      employee_id = (select public.current_onboarding_employee_id())
      and company_id = (
        select p.company_id from public.profiles p where p.id = (select auth.uid())
      )
    )
  );

drop policy if exists "employee_relatives_select_self_or_backoffice" on public.employee_relatives;
create policy "employee_relatives_select_self_or_backoffice" on public.employee_relatives
  for select to authenticated using (
    (
      company_id = (select public.current_company_id())
      and (
        (select public.is_backoffice())
        or employee_id = (select public.current_employee_id())
      )
    )
    or (
      employee_id = (select public.current_onboarding_employee_id())
      and company_id = (
        select p.company_id from public.profiles p where p.id = (select auth.uid())
      )
    )
  );

drop policy if exists "employee_documents_select_self_or_backoffice" on storage.objects;
create policy "employee_documents_select_self_or_backoffice" on storage.objects
  for select to authenticated using (
    bucket_id = 'employee-documents'
    and (
      (
        (storage.foldername(name))[1] = (select public.current_company_id())::text
        and (
          (select public.is_backoffice())
          or (storage.foldername(name))[2] = (select public.current_employee_id())::text
        )
      )
      or (
        (storage.foldername(name))[1] = (
          select p.company_id::text from public.profiles p where p.id = (select auth.uid())
        )
        and (storage.foldername(name))[2] = (select public.current_onboarding_employee_id())::text
      )
    )
  );

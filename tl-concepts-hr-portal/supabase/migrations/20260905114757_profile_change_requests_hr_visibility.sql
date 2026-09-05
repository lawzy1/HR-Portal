-- HR/Kế toán need to see pending profile-change requests too (the request
-- notification email now also goes to hr, not just admin). Resolve stays
-- admin-only.
drop policy if exists "profile_change_requests_select_self_or_admin" on public.employee_profile_change_requests;
create policy "profile_change_requests_select_self_or_backoffice"
  on public.employee_profile_change_requests
  for select to authenticated using (
    (requested_by = auth.uid() and employee_id = public.current_employee_id())
    or (company_id = public.current_company_id() and public.is_backoffice())
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'employee_profile_change_requests'
  ) then
    alter publication supabase_realtime add table public.employee_profile_change_requests;
  end if;
end $$;

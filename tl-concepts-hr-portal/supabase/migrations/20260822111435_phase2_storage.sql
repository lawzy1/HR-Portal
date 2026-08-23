-- Private bucket for CCCD / VNeID / avatar files. Path convention enforced
-- by the RLS policies below: {company_id}/{employee_id}/{filename}
insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

-- storage.objects.name is the full path; (storage.foldername(name))[1] is
-- the company_id segment, [2] is the employee_id segment.
drop policy if exists "employee_documents_select_self_or_admin" on storage.objects;
create policy "employee_documents_select_self_or_admin" on storage.objects
  for select to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = public.current_employee_id()::text
    )
  );

drop policy if exists "employee_documents_write_admin_only" on storage.objects;
create policy "employee_documents_write_admin_only" on storage.objects
  for all to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.is_admin()
  ) with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

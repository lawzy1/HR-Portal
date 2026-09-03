-- OT records are operational requests, not a compensation calculation surface.
-- Admin owns the full lifecycle; HR/Accounting can read the records and enter
-- the actual payroll amount separately; employees can submit their own pending
-- request but cannot mutate or delete it after submission.

drop policy if exists "ot_records_insert_self_or_admin" on public.ot_records;
drop policy if exists "ot_records_insert_self_or_backoffice" on public.ot_records;
drop policy if exists "ot_records_insert_own_employee_pending" on public.ot_records;
drop policy if exists "ot_records_insert_admin_direct" on public.ot_records;
drop policy if exists "ot_records_update_admin_only" on public.ot_records;
drop policy if exists "ot_records_update_backoffice" on public.ot_records;
drop policy if exists "ot_records_delete_admin_only" on public.ot_records;
create policy "ot_records_insert_own_employee_pending" on public.ot_records
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and employee_id = (select public.current_employee_id())
    and (select public.is_employee())
    and status = 'Chờ duyệt'
    and approver_id is null
    and pay_type is null
    and ot_percentage is null
    and amount is null
  );
create policy "ot_records_insert_admin_direct" on public.ot_records
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );
create policy "ot_records_update_admin_only" on public.ot_records
  for update to authenticated using (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  ) with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );
create policy "ot_records_delete_admin_only" on public.ot_records
  for delete to authenticated using (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );

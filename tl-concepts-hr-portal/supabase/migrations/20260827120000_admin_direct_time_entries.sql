-- Admin may record time entries directly for any employee in their company.
-- Employee self-service restrictions continue to be enforced by the existing policy.

create policy "leave_requests_insert_admin_direct" on public.leave_requests
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );

create policy "ot_records_insert_admin_direct" on public.ot_records
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );

create policy "work_events_insert_admin_direct" on public.work_events
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );

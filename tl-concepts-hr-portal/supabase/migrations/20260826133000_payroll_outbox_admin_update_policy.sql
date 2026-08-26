-- Payroll approval and resend both enqueue email work with INSERT ... ON
-- CONFLICT DO UPDATE. The Phase 9 outbox policy granted Admin INSERT but not
-- UPDATE, so an existing outbox row blocked final payroll approval.

create policy "notification_outbox_update_admin" on public.notification_outbox
  for update to authenticated
  using (
    company_id = public.current_company_id()
    and public.is_admin()
  )
  with check (
    company_id = public.current_company_id()
    and public.is_admin()
  );

grant update on table public.notification_outbox to authenticated;

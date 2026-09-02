-- Retrying delivery only needs to requeue the outbox job. Updating the locked
-- published payroll here is redundant: the worker writes the final delivery
-- status after processing and is already allowed to update delivery metadata.

create or replace function public.retry_payslip_notification(p_payroll_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được gửi lại phiếu lương.'; end if;
  if not exists (
    select 1 from public.payroll_records pr
    where pr.id = p_payroll_id and pr.company_id = public.current_company_id()
      and pr.publish_status = 'published'
  ) then raise exception 'Không tìm thấy phiếu lương đã phát hành.'; end if;

  insert into public.notification_outbox (
    company_id, event_type, entity_type, entity_id, recipient_employee_id,
    recipient_email, payload, status, attempts, available_at, processed_at,
    provider_message_id, last_error, updated_at
  )
  select pr.company_id, 'payslip_published', 'payroll_records', pr.id, pr.employee_id,
    e.email, jsonb_build_object('month', pr.month, 'year', pr.year, 'employee_name', e.full_name),
    'pending', 0, now(), null, null, null, now()
  from public.payroll_records pr
  join public.employees e on e.id = pr.employee_id
  where pr.id = p_payroll_id and pr.company_id = public.current_company_id()
  on conflict (event_type, entity_id) do update
    set recipient_email = excluded.recipient_email, payload = excluded.payload,
        status = 'pending', attempts = 0, available_at = now(), processed_at = null,
        provider_message_id = null, last_error = null, updated_at = now();

  return p_payroll_id;
end;
$$;

revoke all on function public.retry_payslip_notification(uuid) from public, anon;
grant execute on function public.retry_payslip_notification(uuid) to authenticated;

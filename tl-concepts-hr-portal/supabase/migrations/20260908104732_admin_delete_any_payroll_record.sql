-- Admin may remove a payslip in any workflow state so Accounting can replace
-- and publish a corrected record. HR/Accounting keeps the existing draft-only
-- limit. Remove the matching delivery job to avoid retrying a deleted record.

drop policy if exists "notification_outbox_delete_admin" on public.notification_outbox;
create policy "notification_outbox_delete_admin" on public.notification_outbox
  for delete to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  );

grant delete on table public.notification_outbox to authenticated;

create or replace function public.delete_payroll_record(p_payroll_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_id uuid;
  v_is_admin boolean := public.is_admin();
begin
  if not v_is_admin and not public.is_hr_accounting() then
    raise exception 'Không có quyền xóa phiếu lương.';
  end if;

  delete from public.payroll_records
  where id = p_payroll_id
    and company_id = public.current_company_id()
    and (v_is_admin or publish_status in ('draft', 'rejected'))
  returning id into v_deleted_id;

  if v_deleted_id is null then
    if v_is_admin then
      raise exception 'Không tìm thấy phiếu lương cần xóa.';
    end if;
    raise exception 'HR/Kế toán chỉ được xóa phiếu lương nháp hoặc bị trả lại.';
  end if;

  if v_is_admin then
    delete from public.notification_outbox
    where company_id = public.current_company_id()
      and event_type = 'payslip_published'
      and entity_id = p_payroll_id;
  end if;

  return v_deleted_id;
end;
$$;

revoke all on function public.delete_payroll_record(uuid) from public, anon;
grant execute on function public.delete_payroll_record(uuid) to authenticated;

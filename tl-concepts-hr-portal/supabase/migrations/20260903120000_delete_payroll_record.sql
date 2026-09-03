-- Delete one editable payslip through a tenant-scoped back-office RPC.
-- Published and pending payslips remain protected by the payroll workflow.

create or replace function public.delete_payroll_record(p_payroll_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_id uuid;
begin
  if not public.is_backoffice() then
    raise exception 'Không có quyền xóa phiếu lương.';
  end if;

  delete from public.payroll_records
  where id = p_payroll_id
    and company_id = public.current_company_id()
    and publish_status in ('draft', 'rejected')
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'Chỉ được xóa phiếu lương nháp hoặc bị trả lại.';
  end if;

  return v_deleted_id;
end;
$$;

revoke all on function public.delete_payroll_record(uuid) from public, anon;
grant execute on function public.delete_payroll_record(uuid) to authenticated;

-- OT compensation is now entered directly in payroll, not on ot_records.
-- Drop the legacy pay_type/ot_percentage/amount columns and the policy/
-- trigger logic that referenced them.

drop policy if exists "ot_records_insert_own_employee_pending" on public.ot_records;
create policy "ot_records_insert_own_employee_pending" on public.ot_records
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and employee_id = (select public.current_employee_id())
    and (select public.is_employee())
    and status = 'Chờ duyệt'
    and approver_id is null
  );

create or replace function public.guard_employee_request_submission()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb := to_jsonb(new);
begin
  if tg_op = 'INSERT' and public.is_employee() then
    if v_payload ->> 'status' <> 'Chờ duyệt'
       or v_payload ->> 'approver_id' is not null
       or v_payload ->> 'approver_comment' is not null
    then
      raise exception 'Yêu cầu của User phải bắt đầu ở trạng thái chờ Admin duyệt.';
    end if;
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() then
    raise exception 'Chỉ Admin được cập nhật hoặc duyệt yêu cầu phép, OT và work-event.';
  end if;

  return new;
end;
$$;

alter table public.ot_records drop column if exists pay_type;
alter table public.ot_records drop column if exists ot_percentage;
alter table public.ot_records drop column if exists amount;

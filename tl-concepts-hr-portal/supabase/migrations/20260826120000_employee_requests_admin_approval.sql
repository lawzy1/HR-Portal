-- Employee self-service requests are always submitted for Admin review.
-- HR/Kế toán may see operational data but cannot create or approve these rows.

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.role::text = 'employee' and p.is_active
    from public.profiles p
    where p.id = auth.uid()
  ), false)
$$;

revoke all on function public.is_employee() from public, anon;
grant execute on function public.is_employee() to authenticated, service_role;

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

    if tg_table_name = 'ot_records'
       and (
         v_payload ->> 'pay_type' is not null
         or v_payload ->> 'ot_percentage' is not null
         or v_payload ->> 'amount' is not null
       )
    then
      raise exception 'User không được nhập thông tin chi trả OT trước khi Admin duyệt.';
    end if;
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() then
    raise exception 'Chỉ Admin được cập nhật hoặc duyệt yêu cầu phép, OT và work-event.';
  end if;

  return new;
end;
$$;

drop policy if exists "leave_requests_insert_self_or_backoffice" on public.leave_requests;
create policy "leave_requests_insert_own_employee_pending" on public.leave_requests
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and employee_id = (select public.current_employee_id())
    and (select public.is_employee())
    and status = 'Chờ duyệt'
    and approver_id is null
    and approver_comment is null
  );

drop policy if exists "leave_requests_update_backoffice" on public.leave_requests;
create policy "leave_requests_update_admin_only" on public.leave_requests
  for update to authenticated using (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  ) with check (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  );

drop policy if exists "ot_records_insert_self_or_backoffice" on public.ot_records;
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

drop policy if exists "ot_records_update_backoffice" on public.ot_records;
create policy "ot_records_update_admin_only" on public.ot_records
  for update to authenticated using (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  ) with check (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  );

drop policy if exists "work_events_insert_self_or_backoffice" on public.work_events;
create policy "work_events_insert_own_employee_pending" on public.work_events
  for insert to authenticated with check (
    company_id = (select public.current_company_id())
    and employee_id = (select public.current_employee_id())
    and (select public.is_employee())
    and status = 'Chờ duyệt'
    and approver_id is null
    and approver_comment is null
  );

drop policy if exists "work_events_update_backoffice" on public.work_events;
create policy "work_events_update_admin_only" on public.work_events
  for update to authenticated using (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  ) with check (
    company_id = (select public.current_company_id()) and (select public.is_admin())
  );

drop trigger if exists guard_employee_leave_request_submission on public.leave_requests;
create trigger guard_employee_leave_request_submission
  before insert or update on public.leave_requests
  for each row execute function public.guard_employee_request_submission();

drop trigger if exists guard_employee_ot_request_submission on public.ot_records;
create trigger guard_employee_ot_request_submission
  before insert or update on public.ot_records
  for each row execute function public.guard_employee_request_submission();

drop trigger if exists guard_employee_work_event_submission on public.work_events;
create trigger guard_employee_work_event_submission
  before insert or update on public.work_events
  for each row execute function public.guard_employee_request_submission();

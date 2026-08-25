-- Phase 8: three-tier RBAC, payroll approval, and template-aligned terms.

alter type public.user_role add value if not exists 'hr';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.role::text = 'admin' and p.is_active
    from public.profiles p
    where p.id = auth.uid()
  ), false)
$$;

create or replace function public.is_hr_accounting()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.role::text = 'hr' and p.is_active
    from public.profiles p
    where p.id = auth.uid()
  ), false)
$$;

create or replace function public.is_backoffice()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_hr_accounting()
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_hr_accounting() from public, anon;
revoke all on function public.is_backoffice() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_hr_accounting() to authenticated, service_role;
grant execute on function public.is_backoffice() to authenticated, service_role;

-- Per-employee income rules are intentionally independent from rank: the
-- customer confirmed that people at the same level may have different rates.
alter table public.employees
  add column if not exists performance_commission_rate numeric not null default 0 check (performance_commission_rate >= 0),
  add column if not exists qc_commission_rate numeric not null default 0 check (qc_commission_rate >= 0),
  add column if not exists guaranteed_income_amount numeric not null default 0 check (guaranteed_income_amount >= 0);

alter table public.contracts
  add column if not exists level_title text,
  add column if not exists work_location text,
  add column if not exists working_schedule text,
  add column if not exists phone_allowance numeric not null default 0 check (phone_allowance >= 0),
  add column if not exists lunch_allowance numeric not null default 0 check (lunch_allowance >= 0),
  add column if not exists commission_rate_per_view numeric not null default 0 check (commission_rate_per_view >= 0),
  add column if not exists qc_commission_rate_per_view numeric not null default 0 check (qc_commission_rate_per_view >= 0),
  add column if not exists guaranteed_income numeric not null default 0 check (guaranteed_income >= 0),
  add column if not exists adjustment_categories text[] not null default '{}'::text[];

alter table public.kpi_monthly
  add column if not exists commission_rate_snapshot numeric not null default 0,
  add column if not exists performance_commission_amount numeric not null default 0,
  add column if not exists qc_views numeric not null default 0,
  add column if not exists qc_rate_snapshot numeric not null default 0,
  add column if not exists qc_commission_amount numeric not null default 0,
  add column if not exists guaranteed_income_topup numeric not null default 0;

alter table public.payroll_records
  drop constraint if exists payroll_records_publish_status_check;

alter table public.payroll_records
  add constraint payroll_records_publish_status_check
    check (publish_status in ('draft', 'pending_approval', 'published', 'rejected')),
  add column if not exists workday_salary numeric not null default 0,
  add column if not exists annual_leave_used_days numeric not null default 0,
  add column if not exists annual_leave_remaining_days numeric not null default 0,
  add column if not exists dependents_count integer not null default 0 check (dependents_count >= 0),
  add column if not exists holiday_bonus_amount numeric not null default 0,
  add column if not exists welfare_refund numeric not null default 0,
  add column if not exists business_trip_refund numeric not null default 0,
  add column if not exists personal_income_tax_refund numeric not null default 0,
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text;

create index if not exists payroll_records_company_period_status_idx
  on public.payroll_records(company_id, year desc, month desc, publish_status);

-- Company-wide HR data is visible/writable to back-office accounts. Account
-- management, role changes, audit logs, and onboarding approval stay Admin-only.
drop policy if exists "employees_select_self_or_admin" on public.employees;
create policy "employees_select_self_or_backoffice" on public.employees
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or id = public.current_employee_id() or id = public.current_onboarding_employee_id())
  );

drop policy if exists "employees_write_self_or_admin" on public.employees;
create policy "employees_write_self_or_backoffice" on public.employees
  for update to authenticated using (
    (company_id = public.current_company_id() and public.is_backoffice())
    or id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_backoffice())
    or (
      id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_sensitive_select_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_select_self_or_backoffice" on public.employee_sensitive_info
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id() or employee_id = public.current_onboarding_employee_id())
  );

drop policy if exists "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_write_self_or_backoffice" on public.employee_sensitive_info
  for update to authenticated using (
    (company_id = public.current_company_id() and public.is_backoffice())
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_backoffice())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_insert_self_or_backoffice" on public.employee_sensitive_info
  for insert to authenticated with check (
    (company_id = public.current_company_id() and public.is_backoffice())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_relatives_select_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_select_self_or_backoffice" on public.employee_relatives
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id() or employee_id = public.current_onboarding_employee_id())
  );

drop policy if exists "employee_relatives_write_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_write_self_or_backoffice" on public.employee_relatives
  for all to authenticated using (
    (company_id = public.current_company_id() and public.is_backoffice())
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_backoffice())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_documents_select_self_or_admin" on storage.objects;
create policy "employee_documents_select_self_or_backoffice" on storage.objects
  for select to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_employee_id()::text
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
  );

drop policy if exists "employee_documents_write_self_or_admin" on storage.objects;
create policy "employee_documents_write_self_or_backoffice" on storage.objects
  for all to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
  ) with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
  );

drop policy if exists "contracts_select_self_or_admin" on public.contracts;
create policy "contracts_select_self_or_backoffice" on public.contracts
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "contracts_write_admin_only" on public.contracts;
create policy "contracts_write_backoffice" on public.contracts
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "salary_history_select_self_or_admin" on public.salary_history;
create policy "salary_history_select_self_or_backoffice" on public.salary_history
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "salary_history_write_admin_only" on public.salary_history;
create policy "salary_history_write_backoffice" on public.salary_history
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "company_holidays_write_admin_only" on public.company_holidays;
create policy "company_holidays_write_backoffice" on public.company_holidays
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "leave_requests_select_self_or_admin" on public.leave_requests;
create policy "leave_requests_select_self_or_backoffice" on public.leave_requests
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "leave_requests_insert_self_or_admin" on public.leave_requests;
create policy "leave_requests_insert_self_or_backoffice" on public.leave_requests
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "leave_requests_update_admin_only" on public.leave_requests;
create policy "leave_requests_update_backoffice" on public.leave_requests
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "leave_balances_select_self_or_admin" on public.leave_balances;
create policy "leave_balances_select_self_or_backoffice" on public.leave_balances
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "leave_balances_write_admin_only" on public.leave_balances;
create policy "leave_balances_write_backoffice" on public.leave_balances
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "leave_adjustments_select_self_or_admin" on public.leave_balance_adjustments;
create policy "leave_adjustments_select_self_or_backoffice" on public.leave_balance_adjustments
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "leave_adjustments_insert_admin_only" on public.leave_balance_adjustments;
create policy "leave_adjustments_insert_backoffice" on public.leave_balance_adjustments
  for insert to authenticated with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "work_events_select_self_or_admin" on public.work_events;
create policy "work_events_select_self_or_backoffice" on public.work_events
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "work_events_insert_self_or_admin" on public.work_events;
create policy "work_events_insert_self_or_backoffice" on public.work_events
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "work_events_update_admin_only" on public.work_events;
create policy "work_events_update_backoffice" on public.work_events
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "kpi_job_items_select_self_or_admin" on public.kpi_job_items;
create policy "kpi_job_items_select_self_or_backoffice" on public.kpi_job_items
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "kpi_job_items_write_admin_only" on public.kpi_job_items;
create policy "kpi_job_items_write_backoffice" on public.kpi_job_items
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "kpi_monthly_select_self_or_admin" on public.kpi_monthly;
create policy "kpi_monthly_select_self_or_backoffice" on public.kpi_monthly
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "kpi_monthly_write_admin_only" on public.kpi_monthly;
create policy "kpi_monthly_write_backoffice" on public.kpi_monthly
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "kpi_adjustments_select_self_or_admin" on public.kpi_adjustments;
create policy "kpi_adjustments_select_self_or_backoffice" on public.kpi_adjustments
  for select to authenticated using (
    company_id = public.current_company_id()
    and (
      public.is_backoffice()
      or exists (
        select 1 from public.kpi_monthly km
        where km.id = kpi_monthly_id and km.employee_id = public.current_employee_id()
      )
    )
  );
drop policy if exists "kpi_adjustments_write_admin_only" on public.kpi_adjustments;
create policy "kpi_adjustments_write_backoffice" on public.kpi_adjustments
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "ot_records_select_self_or_admin" on public.ot_records;
create policy "ot_records_select_self_or_backoffice" on public.ot_records
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "ot_records_insert_self_or_admin" on public.ot_records;
create policy "ot_records_insert_self_or_backoffice" on public.ot_records
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_backoffice() or employee_id = public.current_employee_id())
  );
drop policy if exists "ot_records_update_admin_only" on public.ot_records;
create policy "ot_records_update_backoffice" on public.ot_records
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

drop policy if exists "payroll_records_select_published_self_or_admin" on public.payroll_records;
create policy "payroll_records_select_published_self_or_backoffice" on public.payroll_records
  for select to authenticated using (
    company_id = public.current_company_id()
    and (
      public.is_backoffice()
      or (employee_id = public.current_employee_id() and publish_status = 'published')
    )
  );
drop policy if exists "payroll_records_write_admin_only" on public.payroll_records;
create policy "payroll_records_write_backoffice" on public.payroll_records
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_backoffice()
  ) with check (
    company_id = public.current_company_id() and public.is_backoffice()
  );

-- HR/Kế toán may prepare records but cannot make a final decision.
create or replace function public.guard_backoffice_final_approval()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old_status text := case when tg_op = 'INSERT' then null else to_jsonb(old) ->> 'status' end;
  v_new_status text := to_jsonb(new) ->> 'status';
begin
  if public.is_hr_accounting()
     and (
       v_new_status in ('Đã duyệt', 'Đã hoàn thành', 'Từ chối', 'approved', 'rejected')
       or v_old_status in ('Đã duyệt', 'Đã hoàn thành', 'Từ chối', 'approved', 'rejected')
     )
  then
    raise exception 'HR/Kế toán không được tạo, sửa hoặc đảo trạng thái bản ghi đã phê duyệt cuối cùng.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_hr_leave_approval on public.leave_requests;
create trigger guard_hr_leave_approval before insert or update on public.leave_requests
  for each row execute function public.guard_backoffice_final_approval();
drop trigger if exists guard_hr_work_event_approval on public.work_events;
create trigger guard_hr_work_event_approval before insert or update on public.work_events
  for each row execute function public.guard_backoffice_final_approval();
drop trigger if exists guard_hr_ot_approval on public.ot_records;
create trigger guard_hr_ot_approval before insert or update on public.ot_records
  for each row execute function public.guard_backoffice_final_approval();

create or replace function public.guard_payroll_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.publish_status <> 'draft' then
    raise exception 'Phiếu lương mới phải bắt đầu ở trạng thái nháp.';
  end if;

  if tg_op = 'INSERT'
     and public.is_hr_accounting()
     and exists (
       select 1 from public.payroll_records pr
       where pr.company_id = new.company_id
         and pr.month = new.month
         and pr.year = new.year
         and pr.publish_status = 'published'
     )
  then
    raise exception 'Kỳ lương đã phát hành; HR/Kế toán không thể bổ sung phiếu lương mới.';
  end if;

  if tg_op = 'DELETE' then
    if public.is_hr_accounting() and old.publish_status not in ('draft', 'rejected') then
      raise exception 'HR/Kế toán chỉ được xóa phiếu lương nháp hoặc bị trả lại.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and public.is_hr_accounting() then
    if old.publish_status in ('pending_approval', 'published') then
      raise exception 'Kỳ lương đang chờ duyệt hoặc đã phát hành không thể sửa bởi HR/Kế toán.';
    end if;
    if new.publish_status not in ('draft', 'pending_approval') then
      raise exception 'HR/Kế toán không có quyền phê duyệt hoặc phát hành phiếu lương.';
    end if;
  end if;

  if new.publish_status = 'published' and not public.is_admin() then
    raise exception 'Chỉ Admin được phê duyệt và phát hành phiếu lương.';
  end if;

  if tg_op = 'UPDATE'
     and new.publish_status = 'published'
     and (
       old.publish_status <> 'pending_approval'
       or new.approved_by is distinct from auth.uid()
       or new.published_by is distinct from auth.uid()
       or new.approved_at is null
       or new.published_at is null
     )
  then
    raise exception 'Payroll chỉ được phát hành từ trạng thái chờ duyệt và phải lưu đầy đủ dấu vết phê duyệt.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_payroll_workflow on public.payroll_records;
create trigger guard_payroll_workflow
  before insert or update or delete on public.payroll_records
  for each row execute function public.guard_payroll_workflow();

create or replace function public.submit_payroll_month(p_month integer, p_year integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_backoffice() then
    raise exception 'Không có quyền gửi duyệt payroll.';
  end if;

  update public.payroll_records
  set publish_status = 'pending_approval',
      approval_requested_at = now(),
      approval_requested_by = auth.uid(),
      approved_at = null,
      approved_by = null,
      published_at = null,
      published_by = null,
      rejection_reason = null
  where company_id = public.current_company_id()
    and month = p_month
    and year = p_year
    and publish_status in ('draft', 'rejected');

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Không có phiếu lương nháp để gửi duyệt.';
  end if;
  return v_count;
end;
$$;

create or replace function public.approve_payroll_month(p_month integer, p_year integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được phê duyệt payroll.';
  end if;

  update public.payroll_records
  set publish_status = 'published',
      approved_at = now(),
      approved_by = auth.uid(),
      published_at = now(),
      published_by = auth.uid(),
      rejection_reason = null
  where company_id = public.current_company_id()
    and month = p_month
    and year = p_year
    and publish_status = 'pending_approval';

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Không có phiếu lương đang chờ duyệt.';
  end if;
  return v_count;
end;
$$;

create or replace function public.reject_payroll_month(p_month integer, p_year integer, p_reason text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được trả lại payroll.';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Vui lòng nhập lý do trả lại.';
  end if;

  update public.payroll_records
  set publish_status = 'rejected',
      approved_at = null,
      approved_by = null,
      published_at = null,
      published_by = null,
      rejection_reason = trim(p_reason)
  where company_id = public.current_company_id()
    and month = p_month
    and year = p_year
    and publish_status = 'pending_approval';

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Không có phiếu lương đang chờ duyệt.';
  end if;
  return v_count;
end;
$$;

revoke all on function public.submit_payroll_month(integer, integer) from public, anon;
revoke all on function public.approve_payroll_month(integer, integer) from public, anon;
revoke all on function public.reject_payroll_month(integer, integer, text) from public, anon;
grant execute on function public.submit_payroll_month(integer, integer) to authenticated;
grant execute on function public.approve_payroll_month(integer, integer) to authenticated;
grant execute on function public.reject_payroll_month(integer, integer, text) to authenticated;

-- Existing self-edit triggers must recognize HR as back-office; active
-- employees remain unable to edit protected employment or identity fields.
create or replace function public.enforce_employee_self_edit_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_backoffice() then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status = 'Chờ duyệt hồ sơ'
     and new.employee_code is not distinct from old.employee_code
     and new.full_name is not distinct from old.full_name
     and new.email is not distinct from old.email
     and new.job_title is not distinct from old.job_title
     and new.department is not distinct from old.department
     and new.start_date is not distinct from old.start_date
     and new.contract_type is not distinct from old.contract_type
     and new.current_salary is not distinct from old.current_salary
     and new.last_salary_review_date is not distinct from old.last_salary_review_date
     and new.performance_commission_rate is not distinct from old.performance_commission_rate
     and new.qc_commission_rate is not distinct from old.qc_commission_rate
     and new.guaranteed_income_amount is not distinct from old.guaranteed_income_amount
     and new.company_id is not distinct from old.company_id
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid()
         and p.employee_id = old.id
         and not p.is_active
         and p.onboarding_status = 'submitted'
     )
  then
    return new;
  end if;

  if new.employee_code is distinct from old.employee_code
     or new.full_name is distinct from old.full_name
     or new.email is distinct from old.email
     or new.job_title is distinct from old.job_title
     or new.department is distinct from old.department
     or new.start_date is distinct from old.start_date
     or new.contract_type is distinct from old.contract_type
     or new.current_salary is distinct from old.current_salary
     or new.last_salary_review_date is distinct from old.last_salary_review_date
     or new.performance_commission_rate is distinct from old.performance_commission_rate
     or new.qc_commission_rate is distinct from old.qc_commission_rate
     or new.guaranteed_income_amount is distinct from old.guaranteed_income_amount
     or new.status is distinct from old.status
     or new.company_id is distinct from old.company_id
  then
    raise exception 'Chỉ Admin/HR được sửa thông tin việc làm, lương và cơ cấu thu nhập.';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_sensitive_self_edit_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_backoffice() then
    return new;
  end if;

  if new.identity_verification_status is distinct from old.identity_verification_status
     or new.identity_verification_note is distinct from old.identity_verification_note
     or new.identity_verified_at is distinct from old.identity_verified_at
     or new.identity_verified_by is distinct from old.identity_verified_by
  then
    raise exception 'Chỉ Admin/HR được xác nhận thông tin định danh.';
  end if;
  return new;
end;
$$;

create or replace function public.record_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_backoffice() or p_action not in ('VIEW', 'EXPORT') then
    raise exception 'Không có quyền ghi audit event.';
  end if;

  insert into public.audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, details)
  values (public.current_company_id(), auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.record_audit_event(text, text, uuid, jsonb) from public, anon;
grant execute on function public.record_audit_event(text, text, uuid, jsonb) to authenticated;

create or replace function public.refresh_leave_accrual(p_employee_id uuid, p_year integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_start_date date;
  v_months numeric;
  v_entitlement numeric;
  v_adjustment numeric;
begin
  select e.company_id, e.start_date into v_company_id, v_start_date
  from public.employees e where e.id = p_employee_id;

  if v_company_id is null
     or v_company_id <> public.current_company_id()
     or (not public.is_backoffice() and p_employee_id <> public.current_employee_id())
  then
    raise exception 'Không có quyền cập nhật quỹ phép này.';
  end if;

  insert into public.leave_balances (company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date)
  values (v_company_id, p_employee_id, p_year, 12, 0, make_date(p_year, 12, 31))
  on conflict (employee_id, year) do nothing;

  select lb.annual_entitlement into v_entitlement
  from public.leave_balances lb where lb.employee_id = p_employee_id and lb.year = p_year;

  v_months := case
    when p_year < extract(year from current_date) then 12
    when p_year > extract(year from current_date) then 0
    when v_start_date is not null and extract(year from v_start_date) = p_year
      then greatest(0, extract(month from current_date) - extract(month from v_start_date) + 1)
    else extract(month from current_date)
  end;

  select coalesce(sum(a.amount), 0) into v_adjustment
  from public.leave_balance_adjustments a
  where a.employee_id = p_employee_id and a.year = p_year;

  update public.leave_balances
  set manual_adjustment = v_adjustment,
      total_accumulated = round((v_entitlement / 12) * v_months + v_adjustment, 2)
  where employee_id = p_employee_id and year = p_year;
end;
$$;

-- Phase 9: approval gates for contracts and monthly KPI, plus a durable
-- payslip notification outbox. Existing published business data is preserved.

alter table public.contracts
  add column if not exists publish_status text not null default 'published',
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text;

alter table public.contracts alter column publish_status set default 'draft';
alter table public.contracts drop constraint if exists contracts_publish_status_check;
alter table public.contracts add constraint contracts_publish_status_check
  check (publish_status in ('draft', 'pending_approval', 'published', 'rejected'));
create index if not exists contracts_company_publish_status_idx
  on public.contracts(company_id, publish_status, start_date desc);

alter table public.kpi_monthly
  add column if not exists publish_status text not null default 'published',
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text;

alter table public.kpi_monthly alter column publish_status set default 'draft';
alter table public.kpi_monthly drop constraint if exists kpi_monthly_publish_status_check;
alter table public.kpi_monthly add constraint kpi_monthly_publish_status_check
  check (publish_status in ('draft', 'pending_approval', 'published', 'rejected'));
create index if not exists kpi_monthly_company_period_publish_idx
  on public.kpi_monthly(company_id, year desc, month desc, publish_status);

alter table public.payroll_records
  add column if not exists payslip_pdf_path text,
  add column if not exists notification_status text not null default 'not_queued',
  add column if not exists notification_sent_at timestamptz;

alter table public.payroll_records drop constraint if exists payroll_records_notification_status_check;
alter table public.payroll_records add constraint payroll_records_notification_status_check
  check (notification_status in ('not_queued', 'pending', 'sent', 'failed', 'skipped'));

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  recipient_employee_id uuid references public.employees(id) on delete cascade,
  recipient_email text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_type, entity_id)
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox(status, available_at, created_at)
  where status in ('pending', 'failed');

alter table public.notification_outbox enable row level security;
create policy "notification_outbox_select_admin" on public.notification_outbox
  for select to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  );
create policy "notification_outbox_insert_admin" on public.notification_outbox
  for insert to authenticated with check (
    company_id = public.current_company_id() and public.is_admin()
  );

revoke all on table public.notification_outbox from public, anon, authenticated;
grant select, insert on table public.notification_outbox to authenticated;
grant all on table public.notification_outbox to service_role;

drop policy if exists "contracts_select_self_or_backoffice" on public.contracts;
create policy "contracts_select_published_self_or_backoffice" on public.contracts
  for select to authenticated using (
    company_id = public.current_company_id()
    and (
      public.is_backoffice()
      or (employee_id = public.current_employee_id() and publish_status = 'published')
    )
  );

drop policy if exists "kpi_monthly_select_self_or_backoffice" on public.kpi_monthly;
create policy "kpi_monthly_select_published_self_or_backoffice" on public.kpi_monthly
  for select to authenticated using (
    company_id = public.current_company_id()
    and (
      public.is_backoffice()
      or (employee_id = public.current_employee_id() and publish_status = 'published')
    )
  );

create or replace function public.guard_contract_approval_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.publish_status <> 'draft' then
      raise exception 'Hợp đồng mới phải bắt đầu ở trạng thái nháp.';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if public.is_hr_accounting() and old.publish_status not in ('draft', 'rejected') then
      raise exception 'HR/Kế toán chỉ được xóa hợp đồng nháp hoặc bị trả lại.';
    end if;
    return old;
  end if;

  if new.publish_status = 'pending_approval'
     and (
       old.publish_status not in ('draft', 'rejected')
       or new.approval_requested_by is distinct from auth.uid()
       or new.approval_requested_at is null
     )
  then
    raise exception 'Hợp đồng chỉ được gửi duyệt từ nháp và phải lưu đầy đủ dấu vết người gửi.';
  end if;

  if public.is_hr_accounting() then
    if old.publish_status in ('pending_approval', 'published') then
      raise exception 'HR/Kế toán không thể sửa hợp đồng đang chờ duyệt hoặc đã phát hành.';
    end if;
    if new.publish_status not in ('draft', 'pending_approval') then
      raise exception 'HR/Kế toán không có quyền phê duyệt hợp đồng.';
    end if;
    if new.publish_status = 'pending_approval'
       and (new.approval_requested_by is distinct from auth.uid() or new.approval_requested_at is null)
    then
      raise exception 'Yêu cầu duyệt hợp đồng phải lưu người gửi và thời điểm gửi.';
    end if;
  end if;

  if new.publish_status = 'published'
     and (
       not public.is_admin()
       or old.publish_status <> 'pending_approval'
       or new.approved_by is distinct from auth.uid()
       or new.approved_at is null
     )
  then
    raise exception 'Hợp đồng chỉ được Admin phát hành từ trạng thái chờ duyệt.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_contract_approval_workflow on public.contracts;
create trigger guard_contract_approval_workflow
  before insert or update or delete on public.contracts
  for each row execute function public.guard_contract_approval_workflow();

create or replace function public.submit_contract(p_contract_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_backoffice() then
    raise exception 'Không có quyền gửi duyệt hợp đồng.';
  end if;
  update public.contracts
  set publish_status = 'pending_approval',
      approval_requested_at = now(),
      approval_requested_by = auth.uid(),
      approved_at = null,
      approved_by = null,
      rejection_reason = null
  where id = p_contract_id
    and company_id = public.current_company_id()
    and publish_status in ('draft', 'rejected');
  if not found then raise exception 'Không tìm thấy hợp đồng nháp để gửi duyệt.'; end if;
  return p_contract_id;
end;
$$;

create or replace function public.approve_contract(p_contract_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_old_salary numeric;
  v_categories text[];
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được phê duyệt hợp đồng.'; end if;

  update public.contracts
  set publish_status = 'published', approved_at = now(), approved_by = auth.uid(), rejection_reason = null
  where id = p_contract_id
    and company_id = public.current_company_id()
    and publish_status = 'pending_approval'
  returning * into v_contract;
  if not found then raise exception 'Không tìm thấy hợp đồng đang chờ duyệt.'; end if;

  if v_contract.status = 'Đang hiệu lực' then
    select e.current_salary into v_old_salary
    from public.employees e where e.id = v_contract.employee_id for update;
    v_categories := case
      when v_contract.type = 'Phụ lục hợp đồng' then v_contract.adjustment_categories
      else array['position', 'salary', 'level', 'commission']::text[]
    end;

    update public.employees
    set contract_type = case when v_contract.type <> 'Phụ lục hợp đồng' then v_contract.type else contract_type end,
        job_title = case when 'position' = any(v_categories) then v_contract.position else job_title end,
        current_salary = case when 'salary' = any(v_categories) then v_contract.salary else current_salary end,
        last_salary_review_date = case
          when 'salary' = any(v_categories) and v_contract.salary is distinct from v_old_salary then v_contract.start_date
          else last_salary_review_date
        end,
        kpi_level = case when 'level' = any(v_categories) then v_contract.level_title else kpi_level end,
        performance_commission_rate = case
          when 'commission' = any(v_categories) then v_contract.commission_rate_per_view
          else performance_commission_rate
        end,
        qc_commission_rate = case
          when 'commission' = any(v_categories) then v_contract.qc_commission_rate_per_view
          else qc_commission_rate
        end,
        guaranteed_income_amount = case
          when 'commission' = any(v_categories) then v_contract.guaranteed_income
          else guaranteed_income_amount
        end,
        updated_at = now()
    where id = v_contract.employee_id and company_id = v_contract.company_id;

    if 'salary' = any(v_categories)
       and v_contract.salary is not null
       and v_contract.salary is distinct from v_old_salary
    then
      insert into public.salary_history (
        company_id, employee_id, effective_date, old_salary, new_salary,
        change_type, reason, approved_by
      ) values (
        v_contract.company_id, v_contract.employee_id, v_contract.start_date,
        v_old_salary, v_contract.salary,
        case when v_contract.type = 'Phụ lục hợp đồng' then 'Phụ lục HĐLĐ' else 'HĐLĐ' end,
        coalesce(v_contract.note, 'Cập nhật theo hợp đồng được duyệt'), auth.uid()::text
      );
    end if;
  end if;
  return p_contract_id;
end;
$$;

create or replace function public.reject_contract(p_contract_id uuid, p_reason text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được trả lại hợp đồng.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Vui lòng nhập lý do trả lại.'; end if;
  update public.contracts
  set publish_status = 'rejected', approved_at = null, approved_by = null,
      rejection_reason = trim(p_reason)
  where id = p_contract_id
    and company_id = public.current_company_id()
    and publish_status = 'pending_approval';
  if not found then raise exception 'Không tìm thấy hợp đồng đang chờ duyệt.'; end if;
  return p_contract_id;
end;
$$;

create or replace function public.guard_kpi_approval_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.publish_status <> 'draft' then
      raise exception 'KPI tháng mới phải bắt đầu ở trạng thái nháp.';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if public.is_hr_accounting() and old.publish_status not in ('draft', 'rejected') then
      raise exception 'HR/Kế toán chỉ được xóa KPI tháng nháp hoặc bị trả lại.';
    end if;
    return old;
  end if;

  if new.publish_status = 'pending_approval'
     and (
       old.publish_status not in ('draft', 'rejected')
       or new.approval_requested_by is distinct from auth.uid()
       or new.approval_requested_at is null
     )
  then
    raise exception 'KPI tháng chỉ được gửi duyệt từ nháp và phải lưu đầy đủ dấu vết người gửi.';
  end if;

  if public.is_hr_accounting() then
    if old.publish_status in ('pending_approval', 'published') then
      raise exception 'HR/Kế toán không thể sửa KPI tháng đang chờ duyệt hoặc đã phát hành.';
    end if;
    if new.publish_status not in ('draft', 'pending_approval') then
      raise exception 'HR/Kế toán không có quyền phê duyệt KPI tháng.';
    end if;
    if new.publish_status = 'pending_approval'
       and (new.approval_requested_by is distinct from auth.uid() or new.approval_requested_at is null)
    then
      raise exception 'Yêu cầu duyệt KPI phải lưu người gửi và thời điểm gửi.';
    end if;
  end if;

  if new.publish_status = 'published'
     and (
       not public.is_admin()
       or old.publish_status <> 'pending_approval'
       or new.approved_by is distinct from auth.uid()
       or new.approved_at is null
     )
  then
    raise exception 'KPI tháng chỉ được Admin phát hành từ trạng thái chờ duyệt.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_kpi_approval_workflow on public.kpi_monthly;
create trigger guard_kpi_approval_workflow
  before insert or update or delete on public.kpi_monthly
  for each row execute function public.guard_kpi_approval_workflow();

create or replace function public.submit_kpi_month(p_month integer, p_year integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if not public.is_backoffice() then raise exception 'Không có quyền gửi duyệt KPI.'; end if;
  update public.kpi_monthly
  set publish_status = 'pending_approval', approval_requested_at = now(),
      approval_requested_by = auth.uid(), approved_at = null, approved_by = null,
      rejection_reason = null
  where company_id = public.current_company_id() and month = p_month and year = p_year
    and publish_status in ('draft', 'rejected');
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'Không có KPI tháng dạng nháp để gửi duyệt.'; end if;
  return v_count;
end;
$$;

create or replace function public.approve_kpi_month(p_month integer, p_year integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được phê duyệt KPI.'; end if;
  update public.kpi_monthly
  set publish_status = 'published', approved_at = now(), approved_by = auth.uid(), rejection_reason = null
  where company_id = public.current_company_id() and month = p_month and year = p_year
    and publish_status = 'pending_approval';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'Không có KPI tháng đang chờ duyệt.'; end if;
  return v_count;
end;
$$;

create or replace function public.reject_kpi_month(p_month integer, p_year integer, p_reason text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được trả lại KPI.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Vui lòng nhập lý do trả lại.'; end if;
  update public.kpi_monthly
  set publish_status = 'rejected', approved_at = null, approved_by = null,
      rejection_reason = trim(p_reason)
  where company_id = public.current_company_id() and month = p_month and year = p_year
    and publish_status = 'pending_approval';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'Không có KPI tháng đang chờ duyệt.'; end if;
  return v_count;
end;
$$;

-- A published payroll is immutable except for delivery metadata. This narrow
-- exception lets the trusted notification worker persist its PDF/email result.
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
       where pr.company_id = new.company_id and pr.month = new.month and pr.year = new.year
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

  if tg_op = 'UPDATE'
     and old.publish_status = 'published'
     and new.publish_status = 'published'
     and not public.is_hr_accounting()
     and (to_jsonb(new) - array['payslip_pdf_path', 'notification_status', 'notification_sent_at'])
         = (to_jsonb(old) - array['payslip_pdf_path', 'notification_status', 'notification_sent_at'])
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.publish_status = 'pending_approval'
     and (
       old.publish_status not in ('draft', 'rejected')
       or new.approval_requested_by is distinct from auth.uid()
       or new.approval_requested_at is null
     )
  then
    raise exception 'Payroll chỉ được gửi duyệt từ nháp và phải lưu đầy đủ dấu vết người gửi.';
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
  if tg_op = 'UPDATE' and new.publish_status = 'published'
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

-- Replace Phase 8 approval with the same atomic state transition plus one
-- idempotent notification job per payslip.
create or replace function public.approve_payroll_month(p_month integer, p_year integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'Chỉ Admin được phê duyệt payroll.'; end if;

  update public.payroll_records
  set publish_status = 'published', approved_at = now(), approved_by = auth.uid(),
      published_at = now(), published_by = auth.uid(), rejection_reason = null,
      notification_status = 'pending', notification_sent_at = null
  where company_id = public.current_company_id() and month = p_month and year = p_year
    and publish_status = 'pending_approval';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'Không có phiếu lương đang chờ duyệt.'; end if;

  insert into public.notification_outbox (
    company_id, event_type, entity_type, entity_id, recipient_employee_id,
    recipient_email, payload, status, attempts, available_at, processed_at,
    provider_message_id, last_error, updated_at
  )
  select pr.company_id, 'payslip_published', 'payroll_records', pr.id, pr.employee_id,
    e.email,
    jsonb_build_object('month', pr.month, 'year', pr.year, 'employee_name', e.full_name),
    'pending', 0, now(), null, null, null, now()
  from public.payroll_records pr
  join public.employees e on e.id = pr.employee_id
  where pr.company_id = public.current_company_id() and pr.month = p_month and pr.year = p_year
    and pr.publish_status = 'published' and pr.approved_by = auth.uid()
  on conflict (event_type, entity_id) do update
    set recipient_email = excluded.recipient_email, payload = excluded.payload,
        status = 'pending', attempts = 0, available_at = now(), processed_at = null,
        provider_message_id = null, last_error = null, updated_at = now();
  return v_count;
end;
$$;

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
  from public.payroll_records pr join public.employees e on e.id = pr.employee_id
  where pr.id = p_payroll_id and pr.company_id = public.current_company_id()
  on conflict (event_type, entity_id) do update
    set recipient_email = excluded.recipient_email, payload = excluded.payload,
        status = 'pending', attempts = 0, available_at = now(), processed_at = null,
        provider_message_id = null, last_error = null, updated_at = now();

  update public.payroll_records
  set notification_status = 'pending', notification_sent_at = null
  where id = p_payroll_id;
  return p_payroll_id;
end;
$$;

revoke all on function public.submit_contract(uuid) from public, anon;
revoke all on function public.approve_contract(uuid) from public, anon;
revoke all on function public.reject_contract(uuid, text) from public, anon;
revoke all on function public.submit_kpi_month(integer, integer) from public, anon;
revoke all on function public.approve_kpi_month(integer, integer) from public, anon;
revoke all on function public.reject_kpi_month(integer, integer, text) from public, anon;
grant execute on function public.submit_contract(uuid) to authenticated;
grant execute on function public.approve_contract(uuid) to authenticated;
grant execute on function public.reject_contract(uuid, text) to authenticated;
grant execute on function public.submit_kpi_month(integer, integer) to authenticated;
grant execute on function public.approve_kpi_month(integer, integer) to authenticated;
grant execute on function public.reject_kpi_month(integer, integer, text) to authenticated;
revoke all on function public.retry_payslip_notification(uuid) from public, anon;
grant execute on function public.retry_payslip_notification(uuid) to authenticated;

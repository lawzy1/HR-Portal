-- Phase 10: align leave defaults and official document integrity with the
-- approved TL Concepts business workflow.

alter table public.company_settings
  add column if not exists annual_leave_entitlement numeric not null default 12
    check (annual_leave_entitlement >= 0);

alter table public.company_settings
  alter column family_deduction set default 15500000,
  add column if not exists dependent_deduction numeric not null default 6200000
    check (dependent_deduction >= 0);

-- Migrate only the old system default; a company that had already configured a
-- different amount is left intact.
update public.company_settings
set family_deduction = 15500000
where family_deduction = 11000000;

alter table public.leave_balances
  alter column annual_entitlement set default 12;

alter table public.companies
  add column if not exists address text,
  add column if not exists tax_code text;

update public.companies
set address = coalesce(address, '43 ấp Thới Tây 2, Xã Hóc Môn, TP Hồ Chí Minh, Việt Nam'),
    tax_code = coalesce(tax_code, '0315597365')
where name ilike '%TL CONCEPTS%';

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
  v_default_entitlement numeric;
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

  select coalesce(cs.annual_leave_entitlement, 12)
  into v_default_entitlement
  from public.company_settings cs
  where cs.company_id = v_company_id;
  v_default_entitlement := coalesce(v_default_entitlement, 12);

  insert into public.leave_balances (
    company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date
  ) values (
    v_company_id, p_employee_id, p_year, v_default_entitlement, 0, make_date(p_year, 12, 31)
  ) on conflict (employee_id, year) do nothing;

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

revoke all on function public.refresh_leave_accrual(uuid, integer) from public, anon;
grant execute on function public.refresh_leave_accrual(uuid, integer) to authenticated, service_role;

create or replace function public.create_default_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_months numeric;
  v_entitlement numeric;
begin
  select coalesce(cs.annual_leave_entitlement, 12)
  into v_entitlement
  from public.company_settings cs
  where cs.company_id = new.company_id;
  v_entitlement := coalesce(v_entitlement, 12);

  v_months := case
    when new.start_date is not null and extract(year from new.start_date) = v_year
      then greatest(0, extract(month from current_date) - extract(month from new.start_date) + 1)
    else extract(month from current_date)
  end;

  insert into public.leave_balances (
    company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date
  ) values (
    new.company_id, new.id, v_year, v_entitlement,
    round((v_entitlement / 12) * v_months, 2), make_date(v_year, 12, 31)
  ) on conflict (employee_id, year) do nothing;
  return new;
end;
$$;

revoke all on function public.create_default_leave_balance() from public, anon, authenticated;

-- Changing the company default updates only balances that still match the old
-- default. A manually customized employee entitlement is therefore preserved.
create or replace function public.sync_company_leave_entitlement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.annual_leave_entitlement is not distinct from old.annual_leave_entitlement then
    return new;
  end if;

  update public.leave_balances lb
  set annual_entitlement = new.annual_leave_entitlement,
      total_accumulated = round(
        (new.annual_leave_entitlement / 12) *
        case
          when lb.year < extract(year from current_date) then 12
          when lb.year > extract(year from current_date) then 0
          when e.start_date is not null and extract(year from e.start_date) = lb.year
            then greatest(0, extract(month from current_date) - extract(month from e.start_date) + 1)
          else extract(month from current_date)
        end + lb.manual_adjustment,
        2
      )
  from public.employees e
  where lb.employee_id = e.id
    and lb.company_id = new.company_id
    and lb.year >= extract(year from current_date)::integer
    and lb.annual_entitlement = old.annual_leave_entitlement;

  return new;
end;
$$;

drop trigger if exists sync_company_leave_entitlement on public.company_settings;
create trigger sync_company_leave_entitlement
  after update of annual_leave_entitlement on public.company_settings
  for each row execute function public.sync_company_leave_entitlement();

revoke all on function public.sync_company_leave_entitlement() from public, anon, authenticated;

-- Company legal identity is editable only by Admin and is used on official
-- payslip PDFs.
drop policy if exists "companies_update_admin_only" on public.companies;
create policy "companies_update_admin_only" on public.companies
  for update to authenticated using (
    id = public.current_company_id() and public.is_admin()
  ) with check (
    id = public.current_company_id() and public.is_admin()
  );

grant update (address, tax_code) on public.companies to authenticated;

alter table public.contracts
  add column if not exists document_sha256 text
    check (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$');

alter table public.payroll_records
  add column if not exists payslip_pdf_sha256 text
    check (payslip_pdf_sha256 is null or payslip_pdf_sha256 ~ '^[0-9a-f]{64}$');

-- F01: the database, not the uploaded workbook, is the source of truth for
-- final net pay. Postgres numeric keeps the exact decimal values imported by
-- Accounting; no rounding is applied here.
alter table public.payroll_records
  add column if not exists total_deductions numeric generated always as (
    bhxh_deduction + bhyt_deduction + bhtn_deduction
    + personal_income_tax + advance_payment + other_deductions
  ) stored,
  add column if not exists total_adjustments numeric generated always as (
    welfare_refund + business_trip_refund + personal_income_tax_refund
    + prior_month_adjustment
  ) stored;

create or replace function public.calculate_payroll_final_net()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_self_deduction numeric;
  v_dependent_deduction numeric;
begin
  select cs.family_deduction, cs.dependent_deduction
  into v_self_deduction, v_dependent_deduction
  from public.company_settings cs
  where cs.company_id = new.company_id;

  v_self_deduction := coalesce(v_self_deduction, 15500000);
  v_dependent_deduction := coalesce(v_dependent_deduction, 6200000);
  new.family_deduction := v_self_deduction
    + (coalesce(new.dependents_count, 0) * v_dependent_deduction);
  new.taxable_income := new.workday_salary + new.kpi_bonus
    + new.ot_pay + new.project_bonus_amount + new.holiday_bonus_amount
    - (new.base_salary * 0.105) - new.family_deduction;

  new.net_salary := new.gross_income
    - (
      new.bhxh_deduction + new.bhyt_deduction + new.bhtn_deduction
      + new.personal_income_tax + new.advance_payment + new.other_deductions
    )
    + (
      new.welfare_refund + new.business_trip_refund + new.personal_income_tax_refund
      + new.prior_month_adjustment
    );
  return new;
end;
$$;

drop trigger if exists calculate_payroll_final_net on public.payroll_records;
create trigger calculate_payroll_final_net
  before insert or update of
    gross_income, bhxh_deduction, bhyt_deduction, bhtn_deduction,
    personal_income_tax, advance_payment, other_deductions,
    welfare_refund, business_trip_refund, personal_income_tax_refund,
    prior_month_adjustment, net_salary, workday_salary, kpi_bonus, ot_pay,
    project_bonus_amount, holiday_bonus_amount, base_salary, dependents_count,
    taxable_income, family_deduction
  on public.payroll_records
  for each row execute function public.calculate_payroll_final_net();

revoke all on function public.calculate_payroll_final_net() from public, anon, authenticated;

-- Backfill historical rows once. The workflow guard is disabled only inside
-- this transactional migration so published rows receive the corrected F01
-- value without opening a runtime path that can mutate approved payroll.
alter table public.payroll_records disable trigger guard_payroll_workflow;
update public.payroll_records
set net_salary = gross_income
  - total_deductions
  + total_adjustments
where net_salary is distinct from gross_income - total_deductions + total_adjustments;
alter table public.payroll_records enable trigger guard_payroll_workflow;

-- A published payroll remains immutable except for delivery metadata written
-- by the trusted worker, including the PDF content hash.
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
     and (to_jsonb(new) - array['payslip_pdf_path', 'payslip_pdf_sha256', 'notification_status', 'notification_sent_at'])
         = (to_jsonb(old) - array['payslip_pdf_path', 'payslip_pdf_sha256', 'notification_status', 'notification_sent_at'])
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

-- Split Storage writes by operation. Draft/onboarding files remain editable,
-- while a file referenced by a pending or published contract/payslip cannot be
-- replaced or deleted by either HR or Admin. Service-role maintenance remains
-- available for controlled offboarding and PDF generation.
drop policy if exists "employee_documents_write_self_or_backoffice" on storage.objects;

create policy "employee_documents_insert_self_or_backoffice" on storage.objects
  for insert to authenticated with check (
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

create policy "employee_documents_update_unpublished" on storage.objects
  for update to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
    and not exists (
      select 1 from public.contracts c
      where c.document_path = storage.objects.name and c.publish_status in ('pending_approval', 'published')
    )
    and not exists (
      select 1 from public.payroll_records pr
      where pr.payslip_pdf_path = storage.objects.name and pr.publish_status = 'published'
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
    and not exists (
      select 1 from public.contracts c
      where c.document_path = storage.objects.name and c.publish_status in ('pending_approval', 'published')
    )
    and not exists (
      select 1 from public.payroll_records pr
      where pr.payslip_pdf_path = storage.objects.name and pr.publish_status = 'published'
    )
  );

create policy "employee_documents_delete_unpublished" on storage.objects
  for delete to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
    and not exists (
      select 1 from public.contracts c
      where c.document_path = storage.objects.name and c.publish_status in ('pending_approval', 'published')
    )
    and not exists (
      select 1 from public.payroll_records pr
      where pr.payslip_pdf_path = storage.objects.name and pr.publish_status = 'published'
    )
  );

grant select, update on public.company_settings to authenticated;
grant select on public.companies to authenticated;
grant select, insert, update, delete on public.contracts to authenticated;
grant select, insert, update, delete on public.payroll_records to authenticated;

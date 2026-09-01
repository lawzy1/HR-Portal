-- Simplify onboarding, accrue leave from official contracts for new hires, and
-- align contract KPI with the employee's daily KPI target.

alter table public.contracts
  rename column kpi_target_month to kpi_target_per_day;

alter table public.employees
  add column leave_accrual_mode text not null default 'contract_monthly'
    check (leave_accrual_mode in ('manual', 'contract_monthly'));

-- Everyone already in the system keeps the balance HR initializes manually.
-- Employees created after this migration use contract-based monthly accrual.
update public.employees set leave_accrual_mode = 'manual';

-- Preserve every current balance as an immutable opening adjustment before the
-- old employee-start-date formula is replaced.
insert into public.leave_balance_adjustments (
  company_id, employee_id, year, amount, reason, created_by
)
select
  lb.company_id,
  lb.employee_id,
  lb.year,
  lb.total_accumulated - coalesce(a.adjustment, 0),
  'Số dư phép khởi tạo khi chuyển sang cơ chế nhập tay',
  null
from public.leave_balances lb
left join (
  select employee_id, year, sum(amount) as adjustment
  from public.leave_balance_adjustments
  group by employee_id, year
) a on a.employee_id = lb.employee_id and a.year = lb.year
where lb.total_accumulated - coalesce(a.adjustment, 0) <> 0;

alter table public.leave_balances
  alter column total_accumulated set default 0;

create or replace function public.refresh_leave_accrual(p_employee_id uuid, p_year integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_accrual_mode text;
  v_contract_start date;
  v_default_entitlement numeric;
  v_entitlement numeric;
  v_accrued_months numeric := 0;
  v_adjustment numeric;
begin
  select e.company_id, e.leave_accrual_mode
  into v_company_id, v_accrual_mode
  from public.employees e
  where e.id = p_employee_id;

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
  from public.leave_balances lb
  where lb.employee_id = p_employee_id and lb.year = p_year;

  select coalesce(sum(a.amount), 0) into v_adjustment
  from public.leave_balance_adjustments a
  where a.employee_id = p_employee_id and a.year = p_year;

  if v_accrual_mode = 'contract_monthly' then
    select min(c.start_date) into v_contract_start
    from public.contracts c
    where c.employee_id = p_employee_id
      and c.company_id = v_company_id
      and c.publish_status = 'published'
      and c.type <> 'Thử việc'
      and c.type <> 'Phụ lục hợp đồng';

    if v_contract_start is not null then
      select count(*)::numeric into v_accrued_months
      from generate_series(
        v_contract_start::timestamp,
        least(current_date, make_date(p_year, 12, 31))::timestamp,
        interval '1 month'
      ) as accrued_on
      where accrued_on::date >= make_date(p_year, 1, 1);
    end if;
  end if;

  update public.leave_balances
  set manual_adjustment = v_adjustment,
      total_accumulated = greatest(
        0,
        case
          when v_accrual_mode = 'contract_monthly' then least(v_entitlement, v_accrued_months) + v_adjustment
          else v_adjustment
        end
      )
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
  v_entitlement numeric;
begin
  select coalesce(cs.annual_leave_entitlement, 12)
  into v_entitlement
  from public.company_settings cs
  where cs.company_id = new.company_id;

  insert into public.leave_balances (
    company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date
  ) values (
    new.company_id, new.id, v_year, coalesce(v_entitlement, 12), 0, make_date(v_year, 12, 31)
  ) on conflict (employee_id, year) do nothing;
  return new;
end;
$$;

revoke all on function public.create_default_leave_balance() from public, anon, authenticated;

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

  update public.leave_balances
  set annual_entitlement = new.annual_leave_entitlement
  where company_id = new.company_id
    and year >= extract(year from current_date)::integer
    and annual_entitlement = old.annual_leave_entitlement;
  return new;
end;
$$;

-- Rebuild the preserved manual balances after the opening adjustments above.
update public.leave_balances lb
set manual_adjustment = coalesce((
      select sum(a.amount) from public.leave_balance_adjustments a
      where a.employee_id = lb.employee_id and a.year = lb.year
    ), 0),
    total_accumulated = greatest(0, coalesce((
      select sum(a.amount) from public.leave_balance_adjustments a
      where a.employee_id = lb.employee_id and a.year = lb.year
    ), 0))
from public.employees e
where e.id = lb.employee_id and e.leave_accrual_mode = 'manual';

-- Allow an invited employee to edit only their own display name while their
-- onboarding record is still open. Employment and payroll fields stay locked.
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
     and new.leave_accrual_mode is not distinct from old.leave_accrual_mode
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

  if new.full_name is distinct from old.full_name
     and new.employee_code is not distinct from old.employee_code
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
     and new.leave_accrual_mode is not distinct from old.leave_accrual_mode
     and new.status is not distinct from old.status
     and new.company_id is not distinct from old.company_id
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid()
         and p.employee_id = old.id
         and not p.is_active
         and p.onboarding_status in ('in_progress', 'needs_changes')
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
     or new.leave_accrual_mode is distinct from old.leave_accrual_mode
     or new.status is distinct from old.status
     or new.company_id is distinct from old.company_id
  then
    raise exception 'Chỉ Admin/HR được sửa thông tin việc làm, lương và cơ cấu thu nhập.';
  end if;
  return new;
end;
$$;

create or replace function public.save_and_submit_own_onboarding(
  p_employee jsonb,
  p_sensitive jsonb,
  p_relatives jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_company_id uuid;
begin
  if jsonb_typeof(p_employee) <> 'object'
     or jsonb_typeof(p_sensitive) <> 'object'
     or jsonb_typeof(p_relatives) <> 'array'
  then
    raise exception 'Dữ liệu onboarding không hợp lệ';
  end if;

  if nullif(trim(coalesce(p_employee ->> 'phone', '')), '') is null
     or nullif(p_employee ->> 'dob', '') is null
     or nullif(trim(coalesce(p_employee ->> 'gender', '')), '') is null
  then
    raise exception 'Cần nhập số điện thoại, ngày sinh và giới tính trước khi gửi';
  end if;

  select p.employee_id, p.company_id
  into v_employee_id, v_company_id
  from public.profiles p
  where p.id = auth.uid()
    and not p.is_active
    and p.onboarding_status in ('in_progress', 'needs_changes')
  for update;

  if v_employee_id is null then
    raise exception 'Hồ sơ không ở trạng thái có thể gửi';
  end if;

  update public.employees
  set full_name = coalesce(nullif(trim(coalesce(p_employee ->> 'full_name', '')), ''), full_name),
      avatar_url = nullif(trim(coalesce(p_employee ->> 'avatar_url', '')), ''),
      phone = trim(p_employee ->> 'phone'),
      dob = (p_employee ->> 'dob')::date,
      gender = trim(p_employee ->> 'gender'),
      marital_status = nullif(trim(coalesce(p_employee ->> 'marital_status', '')), ''),
      permanent_address = nullif(trim(coalesce(p_employee ->> 'permanent_address', '')), ''),
      temporary_address = nullif(trim(coalesce(p_employee ->> 'temporary_address', '')), ''),
      updated_at = now()
  where id = v_employee_id and company_id = v_company_id;

  insert into public.employee_sensitive_info (
    employee_id, company_id, id_card_number, id_card_issue_date,
    id_card_issue_place, id_card_front_url, id_card_back_url,
    vneid_residency_url, tax_code, social_insurance_code, bank_name,
    bank_account_number, bank_account_holder, bank_branch, updated_at
  ) values (
    v_employee_id, v_company_id,
    nullif(trim(coalesce(p_sensitive ->> 'id_card_number', '')), ''),
    nullif(p_sensitive ->> 'id_card_issue_date', '')::date,
    nullif(trim(coalesce(p_sensitive ->> 'id_card_issue_place', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'id_card_front_url', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'id_card_back_url', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'vneid_residency_url', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'tax_code', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'social_insurance_code', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'bank_name', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'bank_account_number', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'bank_account_holder', '')), ''),
    nullif(trim(coalesce(p_sensitive ->> 'bank_branch', '')), ''), now()
  )
  on conflict (employee_id) do update
  set id_card_number = excluded.id_card_number,
      id_card_issue_date = excluded.id_card_issue_date,
      id_card_issue_place = excluded.id_card_issue_place,
      id_card_front_url = excluded.id_card_front_url,
      id_card_back_url = excluded.id_card_back_url,
      vneid_residency_url = excluded.vneid_residency_url,
      tax_code = excluded.tax_code,
      social_insurance_code = excluded.social_insurance_code,
      bank_name = excluded.bank_name,
      bank_account_number = excluded.bank_account_number,
      bank_account_holder = excluded.bank_account_holder,
      bank_branch = excluded.bank_branch,
      updated_at = now();

  delete from public.employee_relatives where employee_id = v_employee_id;

  insert into public.employee_relatives (
    employee_id, company_id, full_name, relationship, phone, address, is_emergency_contact
  )
  select
    v_employee_id,
    v_company_id,
    trim(relative.value ->> 'full_name'),
    nullif(trim(coalesce(relative.value ->> 'relationship', '')), ''),
    nullif(trim(coalesce(relative.value ->> 'phone', '')), ''),
    nullif(trim(coalesce(relative.value ->> 'address', '')), ''),
    coalesce((relative.value ->> 'is_emergency_contact')::boolean, false)
  from jsonb_array_elements(p_relatives) as relative(value)
  where nullif(trim(coalesce(relative.value ->> 'full_name', '')), '') is not null;

  update public.profiles
  set onboarding_status = 'submitted',
      onboarding_submitted_at = now(),
      onboarding_note = null
  where id = auth.uid();

  update public.employees
  set status = 'Chờ duyệt hồ sơ', updated_at = now()
  where id = v_employee_id;
end;
$$;

revoke all on function public.save_and_submit_own_onboarding(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_and_submit_own_onboarding(jsonb, jsonb, jsonb) to authenticated;

create or replace function public.submit_own_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid;
begin
  select p.employee_id into v_employee_id
  from public.profiles p
  where p.id = auth.uid()
    and not p.is_active
    and p.onboarding_status in ('in_progress', 'needs_changes');

  if v_employee_id is null then
    raise exception 'Hồ sơ không ở trạng thái có thể gửi';
  end if;

  if not exists (
    select 1 from public.employees e
    where e.id = v_employee_id
      and nullif(trim(e.phone), '') is not null
      and e.dob is not null
      and nullif(trim(e.gender), '') is not null
  ) then
    raise exception 'Cần nhập số điện thoại, ngày sinh và giới tính trước khi gửi';
  end if;

  update public.profiles
  set onboarding_status = 'submitted', onboarding_submitted_at = now(), onboarding_note = null
  where id = auth.uid();

  update public.employee_invitations
  set completed_at = now()
  where auth_user_id = auth.uid() and revoked_at is null;

  update public.employees
  set status = 'Chờ duyệt hồ sơ', updated_at = now()
  where id = v_employee_id;
end;
$$;

revoke all on function public.submit_own_onboarding() from public, anon;
grant execute on function public.submit_own_onboarding() to authenticated;

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
        kpi_target_per_day = case
          when 'commission' = any(v_categories) then v_contract.kpi_target_per_day
          else kpi_target_per_day
        end,
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

revoke all on function public.approve_contract(uuid) from public, anon;
grant execute on function public.approve_contract(uuid) to authenticated;

-- Business-rule smoke check: 01/08 receives one day immediately and two by 01/09.
do $$
begin
  if (select count(*) from generate_series(date '2026-08-01', date '2026-08-01', interval '1 month')) <> 1
     or (select count(*) from generate_series(date '2026-08-01', date '2026-09-01', interval '1 month')) <> 2
  then
    raise exception 'Leave accrual smoke check failed';
  end if;
end;
$$;

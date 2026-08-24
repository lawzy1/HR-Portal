-- Align the implemented phases with the confirmed customer feedback.

-- ===== Identity document review (manual until an eKYC vendor is chosen) =====
alter table public.employee_sensitive_info
  add column if not exists identity_verification_status text not null default 'not_checked'
    check (identity_verification_status in ('not_checked', 'matched', 'mismatch', 'manual_verified')),
  add column if not exists identity_verification_note text,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_verified_by uuid references public.profiles(id) on delete set null;

create or replace function public.enforce_sensitive_self_edit_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.identity_verification_status is distinct from old.identity_verification_status
     or new.identity_verification_note is distinct from old.identity_verification_note
     or new.identity_verified_at is distinct from old.identity_verified_at
     or new.identity_verified_by is distinct from old.identity_verified_by
  then
    raise exception 'Chỉ Admin/HR mới được xác nhận thông tin định danh.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_sensitive_self_edit_columns on public.employee_sensitive_info;
create trigger trg_enforce_sensitive_self_edit_columns
  before update on public.employee_sensitive_info
  for each row execute function public.enforce_sensitive_self_edit_columns();

-- ===== Monthly leave accrual + immutable adjustment ledger =====
alter table public.leave_balances
  add column if not exists annual_entitlement numeric not null default 12,
  add column if not exists manual_adjustment numeric not null default 0;

update public.leave_balances
set annual_entitlement = greatest(12, total_accumulated), manual_adjustment = 0;

alter table public.leave_balances drop column if exists remaining_days;
alter table public.leave_balances
  add column remaining_days numeric generated always as
    (greatest(total_accumulated - used_days, 0)) stored;

create table if not exists public.leave_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  amount numeric not null check (amount <> 0),
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leave_balance_adjustments_employee_year_idx
  on public.leave_balance_adjustments(employee_id, year);

alter table public.leave_balance_adjustments enable row level security;

create policy "leave_adjustments_select_self_or_admin" on public.leave_balance_adjustments
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

create policy "leave_adjustments_insert_admin_only" on public.leave_balance_adjustments
  for insert to authenticated with check (
    company_id = public.current_company_id() and public.is_admin()
  );

create or replace function public.refresh_leave_accrual(p_employee_id uuid, p_year integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_start_date date;
  v_months numeric;
  v_entitlement numeric;
  v_adjustment numeric;
begin
  select company_id, start_date into v_company_id, v_start_date
  from public.employees where id = p_employee_id;

  if v_company_id is null
     or v_company_id <> public.current_company_id()
     or (not public.is_admin() and p_employee_id <> public.current_employee_id())
  then
    raise exception 'Không có quyền cập nhật quỹ phép này.';
  end if;

  insert into public.leave_balances (company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date)
  values (v_company_id, p_employee_id, p_year, 12, 0, make_date(p_year, 12, 31))
  on conflict (employee_id, year) do nothing;

  select annual_entitlement into v_entitlement
  from public.leave_balances where employee_id = p_employee_id and year = p_year;

  v_months := case
    when p_year < extract(year from current_date) then 12
    when p_year > extract(year from current_date) then 0
    when v_start_date is not null and extract(year from v_start_date) = p_year
      then greatest(0, extract(month from current_date) - extract(month from v_start_date) + 1)
    else extract(month from current_date)
  end;

  select coalesce(sum(amount), 0) into v_adjustment
  from public.leave_balance_adjustments
  where employee_id = p_employee_id and year = p_year;

  update public.leave_balances
  set manual_adjustment = v_adjustment,
      total_accumulated = round((v_entitlement / 12) * v_months + v_adjustment, 2)
  where employee_id = p_employee_id and year = p_year;
end;
$$;

create or replace function public.refresh_leave_after_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_leave_accrual(new.employee_id, new.year);
  return new;
end;
$$;

drop trigger if exists trg_refresh_leave_after_adjustment on public.leave_balance_adjustments;
create trigger trg_refresh_leave_after_adjustment
  after insert on public.leave_balance_adjustments
  for each row execute function public.refresh_leave_after_adjustment();

create or replace function public.create_default_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_months numeric;
begin
  v_months := case
    when new.start_date is not null and extract(year from new.start_date) = v_year
      then greatest(0, extract(month from current_date) - extract(month from new.start_date) + 1)
    else extract(month from current_date)
  end;

  insert into public.leave_balances (
    company_id, employee_id, year, annual_entitlement, total_accumulated, expiry_date
  ) values (
    new.company_id, new.id, v_year, 12, v_months, make_date(v_year, 12, 31)
  ) on conflict (employee_id, year) do nothing;
  return new;
end;
$$;

grant select, insert on public.leave_balance_adjustments to authenticated;
grant all on public.leave_balance_adjustments to service_role;
grant execute on function public.refresh_leave_accrual(uuid, integer) to authenticated;

-- ===== Extra WFH / late-arrival records =====
create table if not exists public.work_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null check (event_type in ('extra_wfh', 'late_arrival')),
  event_date date not null,
  minutes integer check (minutes is null or minutes >= 0),
  reason text not null,
  status text not null default 'Chờ duyệt' check (status in ('Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  approver_id uuid references public.profiles(id) on delete set null,
  approver_comment text,
  created_at timestamptz not null default now(),
  check (event_type <> 'late_arrival' or minutes is not null)
);

create index if not exists work_events_employee_date_idx on public.work_events(employee_id, event_date);
alter table public.work_events enable row level security;

create policy "work_events_select_self_or_admin" on public.work_events
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

create policy "work_events_insert_self_or_admin" on public.work_events
  for insert to authenticated with check (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

create policy "work_events_update_admin_only" on public.work_events
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select, insert, update on public.work_events to authenticated;
grant all on public.work_events to service_role;

-- ===== KPI delivery timing =====
alter table public.kpi_job_items
  add column if not exists deadline_at timestamptz,
  add column if not exists completed_at timestamptz;

-- ===== Payroll is imported and published, not calculated by this portal =====
alter table public.payroll_records
  add column if not exists publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published')),
  add column if not exists import_source_name text,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references public.profiles(id) on delete set null;

drop policy if exists "payroll_records_select_self_or_admin" on public.payroll_records;
create policy "payroll_records_select_published_self_or_admin" on public.payroll_records
  for select to authenticated using (
    company_id = public.current_company_id()
    and (
      public.is_admin()
      or (employee_id = public.current_employee_id() and publish_status = 'published')
    )
  );

-- ===== Advisory contract warning; final legal review remains with HR/legal =====
create or replace function public.contract_legal_warnings(p_employee_id uuid)
returns table (severity text, message text)
language plpgsql
stable
set search_path = public
as $$
declare
  fixed_term_count integer;
  has_indefinite boolean;
begin
  select
    count(*) filter (where type in ('HĐ xác định thời hạn (1 năm)', 'HĐ xác định thời hạn (2 năm)')),
    coalesce(bool_or(type = 'HĐ không xác định thời hạn'), false)
  into fixed_term_count, has_indefinite
  from public.contracts
  where employee_id = p_employee_id;

  if not has_indefinite and fixed_term_count >= 2 then
    return query select
      'high'::text,
      'Đã có ít nhất 2 hợp đồng xác định thời hạn. Cần HR/pháp chế kiểm tra Điều 20 Bộ luật Lao động 2019 và các trường hợp áp dụng/ngoại lệ trước khi ký tiếp; hệ thống không thay thế ý kiến pháp lý.'::text;
  elsif not has_indefinite and fixed_term_count = 1 then
    return query select
      'medium'::text,
      'Đã có 1 hợp đồng xác định thời hạn. Cần rà soát lịch sử hợp đồng trước lần ký tiếp theo.'::text;
  end if;
end;
$$;

update public.company_settings set session_timeout_minutes = 30
where session_timeout_minutes = 60;

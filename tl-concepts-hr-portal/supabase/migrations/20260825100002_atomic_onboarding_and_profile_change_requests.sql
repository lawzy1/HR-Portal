-- Keep onboarding writes atomic and make the one-time self-edit boundary
-- explicit in RLS. An active employee must request changes from HR instead
-- of writing their personal, identity, bank, relative, or document data.

create or replace function public.enforce_employee_self_edit_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- submit_own_onboarding and save_and_submit_own_onboarding first mark the
  -- caller's profile as submitted, then make this single system transition.
  -- A browser cannot make that profile transition directly because profiles
  -- has no employee update policy.
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
     and new.company_id is not distinct from old.company_id
     and exists (
       select 1
       from public.profiles p
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
     or new.status is distinct from old.status
     or new.company_id is distinct from old.company_id
  then
    raise exception 'Chỉ Admin/HR mới được sửa chức danh, phòng ban, lương, trạng thái, hợp đồng, mã NV, họ tên hoặc email.';
  end if;

  return new;
end;
$$;

-- The onboarding exception is deliberately limited to inactive dossiers that
-- HR has not accepted yet. Active employees can still read their own profile,
-- but all writes must be made by Admin/HR.
drop policy if exists "employees_write_self_or_admin" on public.employees;
create policy "employees_write_self_or_admin" on public.employees
  for update to authenticated using (
    (company_id = public.current_company_id() and public.is_admin())
    or id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_admin())
    or (
      id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info
  for update to authenticated using (
    (company_id = public.current_company_id() and public.is_admin())
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_admin())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info
  for insert to authenticated with check (
    (company_id = public.current_company_id() and public.is_admin())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_relatives_write_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_write_self_or_admin" on public.employee_relatives
  for all to authenticated using (
    (company_id = public.current_company_id() and public.is_admin())
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id() and public.is_admin())
    or (
      employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "employee_documents_write_self_or_admin" on storage.objects;
create policy "employee_documents_write_self_or_admin" on storage.objects
  for all to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
  ) with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(
      public.current_company_id()::text,
      (select p.company_id::text from public.profiles p where p.id = auth.uid())
    )
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
    )
  );

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

  if nullif(trim(coalesce(p_sensitive ->> 'id_card_number', '')), '') is null
     or nullif(trim(coalesce(p_sensitive ->> 'id_card_front_url', '')), '') is null
     or nullif(trim(coalesce(p_sensitive ->> 'id_card_back_url', '')), '') is null
  then
    raise exception 'Cần hoàn thành CCCD và tải đủ hai mặt trước khi gửi';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(p_relatives) as relative(value)
    where coalesce((relative.value ->> 'is_emergency_contact')::boolean, false)
      and nullif(trim(coalesce(relative.value ->> 'full_name', '')), '') is not null
      and nullif(trim(coalesce(relative.value ->> 'phone', '')), '') is not null
  ) then
    raise exception 'Cần có một người liên hệ khẩn cấp với họ tên và số điện thoại';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_relatives) as relative(value)
    where nullif(trim(coalesce(relative.value ->> 'full_name', '')), '') is null
  ) then
    raise exception 'Họ tên người thân không được để trống';
  end if;

  update public.employees
  set avatar_url = nullif(trim(coalesce(p_employee ->> 'avatar_url', '')), ''),
      phone = nullif(trim(coalesce(p_employee ->> 'phone', '')), ''),
      dob = nullif(p_employee ->> 'dob', '')::date,
      gender = nullif(trim(coalesce(p_employee ->> 'gender', '')), ''),
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
  from jsonb_array_elements(p_relatives) as relative(value);

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

create table if not exists public.employee_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'rejected')),
  notification_sent_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists employee_profile_change_requests_company_status_idx
  on public.employee_profile_change_requests (company_id, status, created_at desc);

create index if not exists employee_profile_change_requests_employee_idx
  on public.employee_profile_change_requests (employee_id, created_at desc);

alter table public.employee_profile_change_requests enable row level security;

create policy "profile_change_requests_select_self_or_admin"
  on public.employee_profile_change_requests
  for select to authenticated using (
    (requested_by = auth.uid() and employee_id = public.current_employee_id())
    or (company_id = public.current_company_id() and public.is_admin())
  );

create policy "profile_change_requests_update_admin_only"
  on public.employee_profile_change_requests
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

revoke all on table public.employee_profile_change_requests from anon, authenticated;
grant select, update on table public.employee_profile_change_requests to authenticated;
grant all on table public.employee_profile_change_requests to service_role;

revoke all on function public.save_and_submit_own_onboarding(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_and_submit_own_onboarding(jsonb, jsonb, jsonb) to authenticated;

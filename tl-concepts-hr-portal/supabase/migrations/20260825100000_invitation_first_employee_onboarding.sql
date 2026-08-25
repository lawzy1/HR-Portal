-- Invitation-first employee onboarding. Public sign-up is retired: only an
-- active admin may create an employee invitation through the Edge Function.

alter table public.profiles
  add column if not exists onboarding_status text not null default 'approved',
  add column if not exists onboarding_submitted_at timestamptz,
  add column if not exists onboarding_reviewed_at timestamptz,
  add column if not exists onboarding_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists onboarding_note text;

alter table public.profiles
  drop constraint if exists profiles_onboarding_status_check;

alter table public.profiles
  add constraint profiles_onboarding_status_check
  check (onboarding_status in ('invited', 'in_progress', 'submitted', 'needs_changes', 'approved'));

-- Preserve the previously deployed self-registration records so a pending
-- employee can still finish their dossier after this flow replaces sign-up.
update public.profiles p
set onboarding_status = 'in_progress'
from public.employees e
where p.employee_id = e.id
  and p.role = 'employee'
  and not p.is_active
  and e.status = 'Chờ duyệt';

create index if not exists profiles_onboarding_review_idx
  on public.profiles (company_id, onboarding_status)
  where role = 'employee';

create unique index if not exists employees_company_email_normalized_key
  on public.employees (company_id, lower(email))
  where email is not null;

create table if not exists public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_sent_at timestamptz not null default now(),
  unique (auth_user_id)
);

create index if not exists employee_invitations_company_employee_idx
  on public.employee_invitations (company_id, employee_id);

alter table public.employee_invitations enable row level security;

drop policy if exists "employee_invitations_select_admin" on public.employee_invitations;
create policy "employee_invitations_select_admin" on public.employee_invitations
  for select to authenticated
  using (company_id = public.current_company_id() and public.is_admin());

-- `current_company_id` and `current_employee_id` are used by all normal
-- business-table policies. Returning NULL for inactive accounts locks them
-- out of the regular portal at the database layer, not only in React.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_id
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.role = 'admin' and p.is_active
    from public.profiles p
    where p.id = auth.uid()
  ), false)
$$;

create or replace function public.current_onboarding_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_id
  from public.profiles p
  where p.id = auth.uid()
    and not p.is_active
    and p.onboarding_status in ('in_progress', 'needs_changes')
$$;

-- Explicit onboarding exception: an inactive employee can only view/edit the
-- three tables needed to finish the dossier, and only their own records.
drop policy if exists "employees_select_self_or_admin" on public.employees;
create policy "employees_select_self_or_admin" on public.employees
  for select to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or id = public.current_employee_id()))
    or id = public.current_onboarding_employee_id()
  );

drop policy if exists "employees_write_self_or_admin" on public.employees;
create policy "employees_write_self_or_admin" on public.employees
  for update to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or id = public.current_employee_id()))
    or id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id()
      and (public.is_admin() or id = public.current_employee_id()))
    or (id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "employee_sensitive_select_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_select_self_or_admin" on public.employee_sensitive_info
  for select to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or employee_id = public.current_onboarding_employee_id()
  );

drop policy if exists "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_write_self_or_admin" on public.employee_sensitive_info
  for update to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or (employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info;
create policy "employee_sensitive_insert_self_or_admin" on public.employee_sensitive_info
  for insert to authenticated with check (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or (employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "employee_relatives_select_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_select_self_or_admin" on public.employee_relatives
  for select to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or employee_id = public.current_onboarding_employee_id()
  );

drop policy if exists "employee_relatives_write_self_or_admin" on public.employee_relatives;
create policy "employee_relatives_write_self_or_admin" on public.employee_relatives
  for all to authenticated using (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or employee_id = public.current_onboarding_employee_id()
  ) with check (
    (company_id = public.current_company_id()
      and (public.is_admin() or employee_id = public.current_employee_id()))
    or (employee_id = public.current_onboarding_employee_id()
      and company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "employee_documents_write_self_or_admin" on storage.objects;
create policy "employee_documents_write_self_or_admin" on storage.objects
  for all to authenticated using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(public.current_company_id()::text, (select p.company_id::text from public.profiles p where p.id = auth.uid()))
    and (public.is_admin() or (storage.foldername(name))[2] = coalesce(public.current_employee_id(), public.current_onboarding_employee_id())::text)
  ) with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = coalesce(public.current_company_id()::text, (select p.company_id::text from public.profiles p where p.id = auth.uid()))
    and (public.is_admin() or (storage.foldername(name))[2] = coalesce(public.current_employee_id(), public.current_onboarding_employee_id())::text)
  );

create or replace function public.create_employee_invitation(
  p_actor_id uuid,
  p_auth_user_id uuid,
  p_employee_code text,
  p_full_name text,
  p_email text,
  p_department text,
  p_job_title text,
  p_start_date date
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_employee public.employees;
begin
  select p.company_id into v_company_id
  from public.profiles p
  where p.id = p_actor_id and p.role = 'admin' and p.is_active;

  if v_company_id is null then
    raise exception 'Chỉ Admin đang hoạt động mới được mời nhân viên';
  end if;

  if nullif(trim(p_employee_code), '') is null
    or nullif(trim(p_full_name), '') is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_department), '') is null
    or nullif(trim(p_job_title), '') is null
    or p_start_date is null then
    raise exception 'Thiếu thông tin công việc bắt buộc';
  end if;

  insert into public.employees (
    company_id, employee_code, full_name, email, department, job_title, start_date, status
  ) values (
    v_company_id, trim(p_employee_code), trim(p_full_name), lower(trim(p_email)), trim(p_department), trim(p_job_title), p_start_date, 'Chờ kích hoạt'
  ) returning * into v_employee;

  insert into public.profiles (id, company_id, employee_id, role, is_active, onboarding_status)
  values (p_auth_user_id, v_company_id, v_employee.id, 'employee', false, 'invited');

  insert into public.employee_invitations (company_id, employee_id, auth_user_id, email, invited_by)
  values (v_company_id, v_employee.id, p_auth_user_id, lower(trim(p_email)), p_actor_id);

  return v_employee;
end;
$$;

create or replace function public.start_own_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set onboarding_status = 'in_progress', onboarding_note = null
  where id = auth.uid() and is_active = false and onboarding_status = 'invited';

  if not found then
    raise exception 'Lời mời không còn hiệu lực hoặc hồ sơ đã được xử lý';
  end if;

  update public.employee_invitations
  set accepted_at = now()
  where auth_user_id = auth.uid() and accepted_at is null;
end;
$$;

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
    and p.is_active = false
    and p.onboarding_status in ('in_progress', 'needs_changes');

  if v_employee_id is null then
    raise exception 'Hồ sơ không ở trạng thái có thể gửi';
  end if;

  if not exists (
    select 1 from public.employee_sensitive_info s
    where s.employee_id = v_employee_id
      and nullif(trim(s.id_card_number), '') is not null
      and s.id_card_front_url is not null
      and s.id_card_back_url is not null
  ) then
    raise exception 'Cần hoàn thành CCCD và tải đủ hai mặt trước khi gửi';
  end if;

  update public.profiles
  set onboarding_status = 'submitted', onboarding_submitted_at = now(), onboarding_note = null
  where id = auth.uid();

  update public.employees set status = 'Chờ duyệt hồ sơ', updated_at = now() where id = v_employee_id;
end;
$$;

create or replace function public.review_employee_onboarding(
  p_profile_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_employee_id uuid;
begin
  select p.company_id into v_company_id
  from public.profiles p
  where p.id = auth.uid() and p.role = 'admin' and p.is_active;

  if v_company_id is null then
    raise exception 'Chỉ Admin đang hoạt động mới được duyệt hồ sơ';
  end if;

  select p.employee_id into v_employee_id
  from public.profiles p
  where p.id = p_profile_id and p.company_id = v_company_id and p.role = 'employee' and p.onboarding_status = 'submitted'
  for update;

  if v_employee_id is null then
    raise exception 'Không tìm thấy hồ sơ đang chờ duyệt';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set onboarding_status = 'approved', is_active = true, onboarding_reviewed_at = now(), onboarding_reviewed_by = auth.uid(), onboarding_note = null
    where id = p_profile_id;
    update public.employees set status = 'Mới tiếp nhận', updated_at = now() where id = v_employee_id;
  elsif p_decision = 'needs_changes' then
    if nullif(trim(p_note), '') is null then
      raise exception 'Cần nêu nội dung cần bổ sung';
    end if;
    update public.profiles
    set onboarding_status = 'needs_changes', onboarding_reviewed_at = now(), onboarding_reviewed_by = auth.uid(), onboarding_note = trim(p_note)
    where id = p_profile_id;
  else
    raise exception 'Quyết định duyệt không hợp lệ';
  end if;
end;
$$;

revoke all on function public.create_employee_invitation(uuid, uuid, text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.create_employee_invitation(uuid, uuid, text, text, text, text, text, date) to service_role;
revoke all on function public.start_own_onboarding() from public, anon;
revoke all on function public.submit_own_onboarding() from public, anon;
revoke all on function public.review_employee_onboarding(uuid, text, text) from public, anon;
grant execute on function public.start_own_onboarding() to authenticated;
grant execute on function public.submit_own_onboarding() to authenticated;
grant execute on function public.review_employee_onboarding(uuid, text, text) to authenticated;

-- The former self-registration trigger must not create profiles from a public
-- auth.signUp call. Invitation creation is the single entry point now.
drop trigger if exists on_auth_user_employee_self_registration on auth.users;
revoke all on function public.handle_employee_self_registration() from public, anon, authenticated;

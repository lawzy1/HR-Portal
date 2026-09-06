alter table public.employee_profile_change_requests
  add column if not exists proposed_changes jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employee_profile_change_requests_proposed_changes_object'
      and conrelid = 'public.employee_profile_change_requests'::regclass
  ) then
    alter table public.employee_profile_change_requests
      add constraint employee_profile_change_requests_proposed_changes_object
      check (jsonb_typeof(proposed_changes) = 'object');
  end if;
end $$;

drop policy if exists "employee_documents_insert_self_or_backoffice" on storage.objects;
create policy "employee_documents_insert_self_or_backoffice" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (
      public.is_backoffice()
      or (storage.foldername(name))[2] = public.current_onboarding_employee_id()::text
      or (
        (storage.foldername(name))[2] = public.current_employee_id()::text
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'employee'
            and p.is_active
            and p.onboarding_status = 'approved'
        )
      )
    )
  );

create or replace function public.approve_employee_profile_change_request(p_request_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.employee_profile_change_requests%rowtype;
  v_employee jsonb;
  v_sensitive jsonb;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được duyệt thay đổi hồ sơ.';
  end if;

  select * into v_request
  from public.employee_profile_change_requests
  where id = p_request_id
    and company_id = public.current_company_id()
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Yêu cầu không tồn tại hoặc đã được xử lý.';
  end if;

  v_employee := coalesce(v_request.proposed_changes -> 'employee', '{}'::jsonb);
  v_sensitive := coalesce(v_request.proposed_changes -> 'sensitive', '{}'::jsonb);

  if v_request.proposed_changes ? 'employee' then
    update public.employees
    set avatar_url = case when v_employee ? 'avatar_url' then v_employee ->> 'avatar_url' else avatar_url end,
        dob = case when v_employee ? 'dob' then nullif(v_employee ->> 'dob', '')::date else dob end,
        gender = case when v_employee ? 'gender' then v_employee ->> 'gender' else gender end,
        marital_status = case when v_employee ? 'marital_status' then v_employee ->> 'marital_status' else marital_status end,
        phone = case when v_employee ? 'phone' then v_employee ->> 'phone' else phone end,
        permanent_address = case when v_employee ? 'permanent_address' then v_employee ->> 'permanent_address' else permanent_address end,
        temporary_address = case when v_employee ? 'temporary_address' then v_employee ->> 'temporary_address' else temporary_address end,
        updated_at = now()
    where id = v_request.employee_id
      and company_id = v_request.company_id;
  end if;

  if v_request.proposed_changes ? 'sensitive' then
    insert into public.employee_sensitive_info (employee_id, company_id)
    values (v_request.employee_id, v_request.company_id)
    on conflict (employee_id) do nothing;

    update public.employee_sensitive_info
    set id_card_number = case when v_sensitive ? 'id_card_number' then v_sensitive ->> 'id_card_number' else id_card_number end,
        id_card_issue_date = case when v_sensitive ? 'id_card_issue_date' then nullif(v_sensitive ->> 'id_card_issue_date', '')::date else id_card_issue_date end,
        id_card_issue_place = case when v_sensitive ? 'id_card_issue_place' then v_sensitive ->> 'id_card_issue_place' else id_card_issue_place end,
        tax_code = case when v_sensitive ? 'tax_code' then v_sensitive ->> 'tax_code' else tax_code end,
        social_insurance_code = case when v_sensitive ? 'social_insurance_code' then v_sensitive ->> 'social_insurance_code' else social_insurance_code end,
        id_card_front_url = case when v_sensitive ? 'id_card_front_url' then v_sensitive ->> 'id_card_front_url' else id_card_front_url end,
        id_card_back_url = case when v_sensitive ? 'id_card_back_url' then v_sensitive ->> 'id_card_back_url' else id_card_back_url end,
        vneid_residency_url = case when v_sensitive ? 'vneid_residency_url' then v_sensitive ->> 'vneid_residency_url' else vneid_residency_url end,
        bank_name = case when v_sensitive ? 'bank_name' then v_sensitive ->> 'bank_name' else bank_name end,
        bank_account_number = case when v_sensitive ? 'bank_account_number' then v_sensitive ->> 'bank_account_number' else bank_account_number end,
        bank_account_holder = case when v_sensitive ? 'bank_account_holder' then v_sensitive ->> 'bank_account_holder' else bank_account_holder end,
        bank_branch = case when v_sensitive ? 'bank_branch' then v_sensitive ->> 'bank_branch' else bank_branch end,
        updated_at = now()
    where employee_id = v_request.employee_id
      and company_id = v_request.company_id;
  end if;

  if v_request.proposed_changes ? 'relatives' then
    delete from public.employee_relatives where employee_id = v_request.employee_id;
    insert into public.employee_relatives (
      employee_id, company_id, full_name, relationship, phone, address, is_emergency_contact
    )
    select
      v_request.employee_id,
      v_request.company_id,
      trim(relative.value ->> 'full_name'),
      nullif(trim(coalesce(relative.value ->> 'relationship', '')), ''),
      nullif(trim(coalesce(relative.value ->> 'phone', '')), ''),
      nullif(trim(coalesce(relative.value ->> 'address', '')), ''),
      coalesce((relative.value ->> 'is_emergency_contact')::boolean, false)
    from jsonb_array_elements(v_request.proposed_changes -> 'relatives') as relative(value);
  end if;

  update public.employee_profile_change_requests
  set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  where id = v_request.id;

  return v_request.employee_id;
end;
$$;

revoke all on function public.approve_employee_profile_change_request(uuid) from public, anon;
grant execute on function public.approve_employee_profile_change_request(uuid) to authenticated;

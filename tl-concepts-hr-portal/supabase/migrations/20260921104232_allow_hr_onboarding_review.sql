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
  where p.id = p_profile_id
    and p.company_id = v_company_id
    and p.role in ('employee', 'hr')
    and p.onboarding_status = 'submitted'
  for update;

  if v_employee_id is null then
    raise exception 'Không tìm thấy hồ sơ đang chờ duyệt';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set onboarding_status = 'approved',
        is_active = true,
        onboarding_reviewed_at = now(),
        onboarding_reviewed_by = auth.uid(),
        onboarding_note = null
    where id = p_profile_id;

    update public.employees
    set status = 'Mới tiếp nhận', updated_at = now()
    where id = v_employee_id;
  elsif p_decision = 'needs_changes' then
    if nullif(trim(p_note), '') is null then
      raise exception 'Cần nêu nội dung cần bổ sung';
    end if;

    update public.profiles
    set onboarding_status = 'needs_changes',
        onboarding_reviewed_at = now(),
        onboarding_reviewed_by = auth.uid(),
        onboarding_note = trim(p_note)
    where id = p_profile_id;
  else
    raise exception 'Quyết định duyệt không hợp lệ';
  end if;
end;
$$;

revoke all on function public.review_employee_onboarding(uuid, text, text) from public, anon;
grant execute on function public.review_employee_onboarding(uuid, text, text) to authenticated;

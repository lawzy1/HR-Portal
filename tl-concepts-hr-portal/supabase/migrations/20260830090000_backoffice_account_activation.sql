-- Back-office accounts are intentionally separate from employees. Their
-- employee_id stays NULL, while an invite session may only activate itself.
create or replace function public.activate_own_backoffice_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_active = true,
      onboarding_status = 'approved',
      onboarding_note = null
  where id = auth.uid()
    and employee_id is null
    and role in ('admin', 'hr')
    and not is_active
    and onboarding_status = 'invited';

  if not found then
    raise exception 'Tài khoản không ở trạng thái có thể kích hoạt';
  end if;
end;
$$;

revoke all on function public.activate_own_backoffice_account() from public, anon;
grant execute on function public.activate_own_backoffice_account() to authenticated;

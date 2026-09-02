-- Lets an admin/hr account undo link_self_employee_profile: detach
-- profiles.employee_id and remove the lightweight employees record it
-- created (falls back to a soft "Đã nghỉ việc" status if the record picked
-- up dependents in the meantime — e.g. contracts/leave/KPI rows — that
-- would block a hard delete).

create or replace function public.unlink_self_employee_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_employee_id uuid;
begin
  select role, employee_id into v_role, v_employee_id
  from public.profiles
  where id = auth.uid();

  if v_role not in ('admin', 'hr') then
    raise exception 'Chỉ Admin hoặc HR mới dùng được chức năng này';
  end if;

  if v_employee_id is null then
    return;
  end if;

  update public.profiles set employee_id = null where id = auth.uid();

  begin
    delete from public.employees where id = v_employee_id;
  exception when others then
    update public.employees set status = 'Đã nghỉ việc' where id = v_employee_id;
  end;
end;
$$;

grant execute on function public.unlink_self_employee_profile() to authenticated;

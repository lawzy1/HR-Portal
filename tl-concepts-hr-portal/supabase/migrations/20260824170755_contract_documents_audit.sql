-- Contract files and authoritative write audit for sensitive HR tables.

alter table public.contracts
  add column if not exists document_path text,
  add column if not exists document_name text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT')),
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_company_created_idx
  on public.audit_logs(company_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin_only" on public.audit_logs;
create policy "audit_logs_select_admin_only" on public.audit_logs
  for select to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  changed_fields jsonb := '[]'::jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
    into changed_fields
    from jsonb_object_keys(to_jsonb(new)) as keys(key)
    where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key;
  end if;

  insert into public.audit_logs (
    company_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    (row_data ->> 'company_id')::uuid,
    auth.uid(),
    tg_op,
    tg_table_name,
    nullif(row_data ->> 'id', '')::uuid,
    jsonb_build_object('changed_fields', changed_fields)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.record_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() or p_action not in ('VIEW', 'EXPORT') then
    raise exception 'Không có quyền ghi audit event.';
  end if;

  insert into public.audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, details)
  values (public.current_company_id(), auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

grant execute on function public.record_audit_event(text, text, uuid, jsonb) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'employees',
    'employee_sensitive_info',
    'contracts',
    'salary_history',
    'leave_requests',
    'leave_balance_adjustments',
    'work_events',
    'ot_records',
    'payroll_records',
    'company_settings'
  ] loop
    execute format('drop trigger if exists audit_%I_changes on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

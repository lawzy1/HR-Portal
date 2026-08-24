-- Phase 3: contracts, salary_history.
-- Admin-only write (unlike Phase 2's employee-self-edit reversal — contract
-- terms and salary are not something an employee self-reports). Self can
-- read their own; admin reads/writes everything in their company.

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  contract_code text not null,
  type text not null,
  start_date date not null,
  end_date date,
  position text,
  salary numeric,
  status text not null default 'Đang hiệu lực',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists contracts_employee_id_idx on public.contracts(employee_id);
create index if not exists contracts_company_id_idx on public.contracts(company_id);

create table if not exists public.salary_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  effective_date date not null,
  old_salary numeric,
  new_salary numeric not null,
  change_type text,
  reason text,
  approved_by text,
  created_at timestamptz not null default now()
);

create index if not exists salary_history_employee_id_idx on public.salary_history(employee_id);
create index if not exists salary_history_company_id_idx on public.salary_history(company_id);

alter table public.contracts enable row level security;
alter table public.salary_history enable row level security;

drop policy if exists "contracts_select_self_or_admin" on public.contracts;
create policy "contracts_select_self_or_admin" on public.contracts
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "contracts_write_admin_only" on public.contracts;
create policy "contracts_write_admin_only" on public.contracts
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

drop policy if exists "salary_history_select_self_or_admin" on public.salary_history;
create policy "salary_history_select_self_or_admin" on public.salary_history
  for select to authenticated using (
    company_id = public.current_company_id()
    and (public.is_admin() or employee_id = public.current_employee_id())
  );

drop policy if exists "salary_history_write_admin_only" on public.salary_history;
create policy "salary_history_write_admin_only" on public.salary_history
  for all to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id() and public.is_admin()
  );

grant select, insert, update, delete on public.contracts to authenticated;
grant select, insert, update, delete on public.salary_history to authenticated;

-- ===== Deterministic legal-rule warning (Điều 20 Bộ luật Lao động 2019) =====
-- A fixed-term contract may only be signed twice in a row with the same
-- employee; from the 3rd contract onward it must be indefinite-term. This
-- is a hard-coded statutory rule, not a live "AI looks up the law" call —
-- more reliable for compliance, and it's exactly the kind of check that
-- should never depend on an LLM's memory of current law at request time.
-- SECURITY INVOKER (the default) so it only ever sees what the calling
-- user's own RLS on `contracts` already allows them to see.
--
-- Verified live against this project (temp rows inserted + rolled back in
-- the same transaction, no data left behind): 2 fixed-term contracts with
-- no indefinite-term contract on file correctly returns the 'high' warning.
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
    bool_or(type = 'HĐ không xác định thời hạn')
  into fixed_term_count, has_indefinite
  from public.contracts
  where employee_id = p_employee_id;

  if not has_indefinite and fixed_term_count >= 2 then
    return query select
      'high'::text,
      'Nhân viên đã ký đủ 2 lần hợp đồng xác định thời hạn. Theo Điều 20 Bộ luật Lao động 2019, hợp đồng lần tiếp theo BẮT BUỘC là loại "Không xác định thời hạn" — không được ký thêm hợp đồng xác định thời hạn lần 3.'::text;
  elsif not has_indefinite and fixed_term_count = 1 then
    return query select
      'medium'::text,
      'Nhân viên đã ký 1 lần hợp đồng xác định thời hạn. Được gia hạn thêm tối đa 1 lần xác định thời hạn nữa — từ lần thứ 3 bắt buộc không xác định thời hạn (Điều 20 Bộ luật Lao động 2019).'::text;
  end if;

  return;
end;
$$;

grant execute on function public.contract_legal_warnings(uuid) to authenticated;

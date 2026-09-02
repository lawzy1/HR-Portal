-- An approved current contract is the source for current employment/pay data.
-- Draft/rejected contracts never affect the employee profile. Expiring
-- contracts remain current until their end date and must sync as well.

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

  if v_contract.status in ('Đang hiệu lực', 'Sắp hết hạn') then
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
          when 'commission' = any(v_categories) then v_contract.kpi_target_month
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

  perform public.refresh_leave_accrual(v_contract.employee_id, extract(year from current_date)::integer);
  return p_contract_id;
end;
$$;

revoke all on function public.approve_contract(uuid) from public, anon;
grant execute on function public.approve_contract(uuid) to authenticated;

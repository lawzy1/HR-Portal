import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';

export type DbContract = Tables<'contracts'>;
export type DbSalaryHistory = Tables<'salary_history'>;
export type ContractLegalWarning = { severity: string; message: string };

export function useContracts(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Admin-only company-wide contract list (RLS enforces this server-side too) —
// used for dashboard/reminder rollups like expiring-contract counts.
export function useAllContracts() {
  return useQuery({
    queryKey: ['contracts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, employees(full_name, employee_code, avatar_url)')
        .order('end_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSalaryHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['salary_history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Deterministic Điều 20 Bộ luật Lao động 2019 check — see
// supabase/migrations/20260824062526_phase3_contracts_salary.sql for the
// rule itself. Not an AI/live-legal-lookup call on purpose.
export function useContractLegalWarnings(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['contract_legal_warnings', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('contract_legal_warnings', {
        p_employee_id: employeeId!,
      });
      if (error) throw error;
      return data as ContractLegalWarning[];
    },
    enabled: !!employeeId,
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

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

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'contracts'>) => {
      const { data, error } = await supabase.from('contracts').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'contracts'> }) => {
      const { data, error } = await supabase.from('contracts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useSubmitContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.rpc('submit_contract', { p_contract_id: contractId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useApproveContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.rpc('approve_contract', { p_contract_id: contractId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary_history'] });
    },
  });
}

export function useRejectContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('reject_contract', { p_contract_id: contractId, p_reason: reason });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
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
      // A single fixed-term contract is routine and does not need an in-app warning.
      return (data as ContractLegalWarning[]).filter((warning) => warning.severity === 'high');
    },
    enabled: !!employeeId,
  });
}

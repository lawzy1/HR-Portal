import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert } from '../lib/database.types';

export type DbPayrollRecord = Tables<'payroll_records'>;

// Employee-facing: every payslip of theirs for a given year.
export function usePayrollRecords(employeeId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['payroll_records', employeeId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('year', year)
        .order('month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Most recent payslip regardless of year — used by the employee dashboard's
// "latest payslip" card, where a plain year filter would miss the case of
// viewing in January before the new year's first payslip exists.
export function useLatestPayrollRecord(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['payroll_records', 'latest', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Single record by id — used by PayslipDetailModal, opened from either the
// employee's own list or the admin table. RLS (self-or-admin) covers both.
export function usePayrollRecord(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll_records', 'by_id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, employees(full_name, employee_code, job_title, department)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Admin: full unbounded payslip history for one employee (no year filter) —
// used by AdminContractSalaryView's per-employee payslip table.
export function useEmployeePayrollHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['payroll_records', 'history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Admin-only monthly payroll table (RLS enforces this server-side too).
export function useAllPayrollRecords(month: number, year: number) {
  return useQuery({
    queryKey: ['payroll_records', 'all', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, employees(full_name, employee_code, job_title, avatar_url)')
        .eq('month', month)
        .eq('year', year);
      if (error) throw error;
      return data;
    },
  });
}

// kpi_bonus and ot_pay are entered directly here — not looked up from
// kpi_monthly/ot_records, per the reduced Phase 6 scope.
export function useUpsertPayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'payroll_records'>) => {
      const { data, error } = await supabase
        .from('payroll_records')
        .upsert(input, { onConflict: 'employee_id,month,year' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
    },
  });
}

export function useImportPayrollRecords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: TablesInsert<'payroll_records'>[]) => {
      const { data, error } = await supabase
        .from('payroll_records')
        .upsert(records, { onConflict: 'employee_id,month,year' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
    },
  });
}

export function usePublishPayrollMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year, profileId }: { month: number; year: number; profileId: string }) => {
      const { data, error } = await supabase
        .from('payroll_records')
        .update({
          publish_status: 'published',
          published_at: new Date().toISOString(),
          published_by: profileId,
        })
        .eq('month', month)
        .eq('year', year)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll_records'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert } from '../lib/database.types';
import { refreshQueries } from '../lib/queryRefresh';

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
        .select('*, employees(full_name, employee_code, job_title, department, email)')
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

export function useAllPayrollHistory() {
  return useQuery({
    queryKey: ['payroll_records', 'all-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, employees(full_name, employee_code, job_title)')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
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
      refreshQueries(queryClient, [['payroll_records']]);
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
      refreshQueries(queryClient, [['payroll_records']]);
    },
  });
}

export function useSubmitPayrollMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data, error } = await supabase.rpc('submit_payroll_month', { p_month: month, p_year: year });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['payroll_records']]),
  });
}

export function useApprovePayrollMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data, error } = await supabase.rpc('approve_payroll_month', { p_month: month, p_year: year });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['payroll_records']]),
  });
}

export type PayslipNotificationResult = {
  processed: number;
  results: Array<{ id: string; status: string; code?: string }>;
};

// Admin-only worker invocation. Approval and queue creation happen atomically
// in Postgres; delivery is separate so a provider outage never rolls back an
// already approved payroll month.
export function useProcessPayslipNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payrollId?: string; limit?: number } = {}) => {
      const { data, error } = await supabase.functions.invoke<PayslipNotificationResult>('process-payslip-outbox', {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['payroll_records']]),
  });
}

export function useRetryPayslipNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payrollId: string) => {
      const { data, error } = await supabase.rpc('retry_payslip_notification', { p_payroll_id: payrollId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['payroll_records']]),
  });
}

export function useRejectPayrollMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year, reason }: { month: number; year: number; reason: string }) => {
      const { data, error } = await supabase.rpc('reject_payroll_month', { p_month: month, p_year: year, p_reason: reason });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['payroll_records']]),
  });
}

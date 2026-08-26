import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';
import { refreshQueries } from '../lib/queryRefresh';

export type DbLeaveRequest = Tables<'leave_requests'>;
export type DbLeaveBalance = Tables<'leave_balances'>;
export type DbCompanyHoliday = Tables<'company_holidays'>;
export type DbWorkEvent = Tables<'work_events'>;

export function useLeaveRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['leave_requests', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Admin-only view (RLS enforces this server-side too) — every pending
// request across the company, for the approval queue.
export function useAllLeaveRequests() {
  return useQuery({
    queryKey: ['leave_requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employees(full_name, employee_code, department, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveBalance(employeeId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['leave_balances', employeeId, year],
    queryFn: async () => {
      const { error: refreshError } = await supabase.rpc('refresh_leave_accrual', {
        p_employee_id: employeeId!,
        p_year: year,
      });
      if (refreshError) throw refreshError;

      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('year', year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useCompanyHolidays() {
  return useQuery({
    queryKey: ['company_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_holidays').select('*').order('date');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddCompanyHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, startDate, endDate, name }: { companyId: string; startDate: string; endDate: string; name: string }) => {
      const dates: string[] = [];
      const cursor = new Date(`${startDate}T00:00:00Z`);
      const lastDate = new Date(`${endDate}T00:00:00Z`);

      while (cursor <= lastDate) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      const { data, error } = await supabase
        .from('company_holidays')
        .upsert(dates.map((date) => ({ company_id: companyId, date, name })), {
          onConflict: 'company_id,date',
          ignoreDuplicates: true,
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['company_holidays'], ['leave_balances']]);
    },
  });
}

// Admin-only company-wide leave balance table — one query joined with
// employees instead of one useLeaveBalance() call per row (which would
// violate the rules of hooks inside a .map()).
export function useAllLeaveBalances(year: number) {
  return useQuery({
    queryKey: ['leave_balances', 'all', year],
    queryFn: async () => {
      const { data: employees, error: employeesError } = await supabase.from('employees').select('id');
      if (employeesError) throw employeesError;

      // ponytail: N calls are fine for the confirmed <=10 employees; replace
      // with one bulk RPC only if tenant size makes this measurable.
      const refreshes = await Promise.all(
        (employees || []).map(({ id }) =>
          supabase.rpc('refresh_leave_accrual', { p_employee_id: id, p_year: year })
        )
      );
      const refreshError = refreshes.find(({ error }) => error)?.error;
      if (refreshError) throw refreshError;

      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, employees(full_name, employee_code, department, avatar_url)')
        .eq('year', year);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddLeaveAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'leave_balance_adjustments'>) => {
      const { data, error } = await supabase
        .from('leave_balance_adjustments')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['leave_balances']]);
    },
  });
}

export function useUpdateLeaveEntitlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, year, entitlement }: { employeeId: string; year: number; entitlement: number }) => {
      const { error } = await supabase
        .from('leave_balances')
        .update({ annual_entitlement: entitlement })
        .eq('employee_id', employeeId)
        .eq('year', year);
      if (error) throw error;
      const { error: refreshError } = await supabase.rpc('refresh_leave_accrual', {
        p_employee_id: employeeId,
        p_year: year,
      });
      if (refreshError) throw refreshError;
    },
    onSuccess: () => refreshQueries(queryClient, [['leave_balances']]),
  });
}

export function useWorkEvents(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['work_events', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_events')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useAllWorkEvents() {
  return useQuery({
    queryKey: ['work_events', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_events')
        .select('*, employees(full_name, employee_code, department, avatar_url)')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorkEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'work_events'>) => {
      const { data, error } = await supabase.from('work_events').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['work_events']]),
  });
}

export function useUpdateWorkEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'work_events'> }) => {
      const { data, error } = await supabase.from('work_events').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [['work_events']]),
  });
}

interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayOption: string;
  reason: string;
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLeaveRequestInput) => {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', input.employeeId)
        .single();
      if (employeeError) throw employeeError;

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          company_id: employee.company_id,
          employee_id: input.employeeId,
          leave_type: input.leaveType,
          start_date: input.startDate,
          end_date: input.endDate,
          total_days: input.totalDays,
          half_day_option: input.halfDayOption,
          reason: input.reason,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      refreshQueries(queryClient, [['leave_requests'], ['leave_balances', variables.employeeId]]);
    },
  });
}

// Admin only (enforced by RLS — leave_requests_update_admin_only).
export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      employeeId: string;
      updates: TablesUpdate<'leave_requests'>;
    }) => {
      const { data, error } = await supabase.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      refreshQueries(queryClient, [['leave_requests'], ['leave_balances', variables.employeeId]]);
    },
  });
}

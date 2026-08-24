import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

export type DbKpiJobItem = Tables<'kpi_job_items'>;
export type DbKpiMonthly = Tables<'kpi_monthly'>;
export type DbKpiAdjustment = Tables<'kpi_adjustments'>;

// employee_id is a required FK now — no more fuzzy assigneeName string
// matching against employees.full_name like the prototype did.
export function useKpiJobItems(employeeId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['kpi_job_items', employeeId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_job_items')
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('month', month)
        .eq('year', year);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Admin: every job across the company for a given period (assignment board).
export function useAllKpiJobItems(month: number, year: number) {
  return useQuery({
    queryKey: ['kpi_job_items', 'all', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_job_items')
        .select('*, employees(full_name, employee_code, avatar_url)')
        .eq('month', month)
        .eq('year', year)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateKpiJobItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'kpi_job_items'>) => {
      const { data, error } = await supabase.from('kpi_job_items').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi_job_items'] });
    },
  });
}

export function useUpdateKpiJobItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'kpi_job_items'> }) => {
      const { data, error } = await supabase.from('kpi_job_items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi_job_items'] });
    },
  });
}

export function useDeleteKpiJobItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kpi_job_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi_job_items'] });
    },
  });
}

export function useKpiMonthly(employeeId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['kpi_monthly', employeeId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_monthly')
        .select('*, kpi_adjustments(*)')
        .eq('employee_id', employeeId!)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useAllKpiMonthly(month: number, year: number) {
  return useQuery({
    queryKey: ['kpi_monthly', 'all', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_monthly')
        .select('*, employees(full_name, employee_code, avatar_url)')
        .eq('month', month)
        .eq('year', year);
      if (error) throw error;
      return data;
    },
  });
}

// Upsert the monthly aggregate (admin "sync KPI to profiles" action).
export function useUpsertKpiMonthly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'kpi_monthly'>) => {
      const { data, error } = await supabase
        .from('kpi_monthly')
        .upsert(input, { onConflict: 'employee_id,month,year' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi_monthly'] });
    },
  });
}

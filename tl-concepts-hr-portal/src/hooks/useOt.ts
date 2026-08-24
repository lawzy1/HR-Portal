import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

export type DbOtRecord = Tables<'ot_records'>;

export function useOtRecords(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['ot_records', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useAllOtRecords() {
  return useQuery({
    queryKey: ['ot_records', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_records')
        .select('*, employees(full_name, employee_code, avatar_url)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOtRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'ot_records'>) => {
      const { data, error } = await supabase.from('ot_records').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ot_records'] });
    },
  });
}

// Admin only (enforced by RLS — ot_records_update_admin_only).
export function useUpdateOtRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'ot_records'> }) => {
      const { data, error } = await supabase.from('ot_records').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ot_records'] });
    },
  });
}

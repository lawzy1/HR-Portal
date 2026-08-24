import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesUpdate } from '../lib/database.types';

export type DbCompanySettings = Tables<'company_settings'>;

// Everywhere a formula used to hard-code a rate (OT %, KPI bonus/point...),
// it should read from here instead.
export function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Admin-only (RLS: company_settings_update_admin_only). Used by
// AdminSettingsView's insurance-rate / standard-work-days form.
export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'company_settings'> }) => {
      const { data, error } = await supabase.from('company_settings').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
    },
  });
}

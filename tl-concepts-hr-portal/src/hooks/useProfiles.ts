import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';

export type DbProfile = Tables<'profiles'>;

// Admin-only company-wide list (RLS enforces this server-side too) — every
// profile joined with its employee record, for the role-assignment table.
// Account and role management stays Admin-only. HR/Kế toán receives access
// to business tables through `is_backoffice()`, never through this hook.
export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, employees(full_name, employee_code, job_title, department, email, avatar_url)')
        .not('employee_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: 'admin' | 'hr' | 'employee' }) => {
      const { data, error } = await supabase.from('profiles').update({ role }).eq('id', profileId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useUpdateProfileAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, isActive }: { profileId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', profileId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useReviewEmployeeOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, decision, note }: { profileId: string; decision: 'approved' | 'needs_changes'; note?: string }) => {
      const { error } = await supabase.rpc('review_employee_onboarding', {
        p_profile_id: profileId,
        p_decision: decision,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

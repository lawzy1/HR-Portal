import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';

export type DbProfile = Tables<'profiles'>;

// Admin-only company-wide list (RLS enforces this server-side too) — every
// profile joined with its employee record, for the role-assignment table.
// The real system only has two roles (see `public.user_role` in
// supabase/migrations/20260822105256_foundation.sql) — the prototype's
// four-tier HR/Manager RBAC fantasy was never actually backed by RLS
// anywhere in this app, only is_admin() (admin vs everyone else).
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
    mutationFn: async ({ profileId, role }: { profileId: string; role: 'admin' | 'employee' }) => {
      const { data, error } = await supabase.from('profiles').update({ role }).eq('id', profileId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

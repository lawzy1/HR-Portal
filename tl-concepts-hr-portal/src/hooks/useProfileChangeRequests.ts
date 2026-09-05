import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';

export type DbProfileChangeRequest = Tables<'employee_profile_change_requests'> & {
  employees: { full_name: string; employee_code: string } | null;
};

export function useAllProfileChangeRequests() {
  return useQuery({
    queryKey: ['employee_profile_change_requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profile_change_requests')
        .select('id, company_id, employee_id, message, status, created_at, resolved_at, employees(full_name, employee_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbProfileChangeRequest[];
    },
  });
}

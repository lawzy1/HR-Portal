import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';
import { refreshQueries } from '../lib/queryRefresh';

export type DbProfileChangeRequest = Tables<'employee_profile_change_requests'> & {
  employees: { full_name: string; employee_code: string } | null;
};

export function useAllProfileChangeRequests() {
  return useQuery({
    queryKey: ['employee_profile_change_requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profile_change_requests')
        .select('id, company_id, employee_id, message, proposed_changes, status, created_at, resolved_at, employees(full_name, employee_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbProfileChangeRequest[];
    },
  });
}

export function useApproveProfileChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('approve_employee_profile_change_request', { p_request_id: requestId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => refreshQueries(queryClient, [
      ['employee_profile_change_requests'],
      ['employees'],
      ['employee_sensitive_info'],
      ['employee_relatives'],
      ['audit_logs'],
    ]),
  });
}

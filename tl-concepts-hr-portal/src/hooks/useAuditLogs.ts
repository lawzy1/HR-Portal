import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles(role, employees(full_name, employee_code))')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecordAuditEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, entityType, entityId, details }: { action: 'VIEW' | 'EXPORT'; entityType: string; entityId?: string; details?: Record<string, string> }) => {
      const { error } = await supabase.rpc('record_audit_event', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: details,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit_logs'] }),
  });
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const QUERY_KEYS = [
  'employees',
  'employee_sensitive_info',
  'contracts',
  'leave_requests',
  'ot_records',
  'work_events',
  'payroll_records',
];

export function useHrDataRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setInterval(() => {
      QUERY_KEYS.forEach(queryKey => queryClient.invalidateQueries({ queryKey: [queryKey] }));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [queryClient]);
}

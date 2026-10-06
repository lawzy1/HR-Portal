import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

const KEY = ['reminder_reads'];

// "Đã đọc" state for generated HR reminders; RLS scopes rows to auth.uid().
export function useReminderReads(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('reminder_reads').select('reminder_id');
      if (error) throw error;
      return data.map((row) => row.reminder_id);
    },
  });
}

export function useMarkRemindersRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('reminder_reads')
        .upsert(ids.map((reminder_id) => ({ reminder_id })), { onConflict: 'profile_id,reminder_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    // Optimistic: hide immediately, roll back if the write fails.
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<string[]>(KEY);
      queryClient.setQueryData<string[]>(KEY, (current = []) => [...new Set([...current, ...ids])]);
      return { previous };
    },
    onError: (_error, _ids, context) => queryClient.setQueryData(KEY, context?.previous),
  });
}

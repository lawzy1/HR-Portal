import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

interface ProfileChangeRequestResponse {
  notificationDelivered: boolean;
}

export function useRequestOwnProfileChange() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase.functions.invoke<ProfileChangeRequestResponse>('request-profile-change', {
        body: { message },
      });
      if (error) throw error;
      return data;
    },
  });
}

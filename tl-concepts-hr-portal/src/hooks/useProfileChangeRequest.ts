import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ProfileChangeProposal } from '../utils/profileChangeProposal';

interface ProfileChangeRequestResponse {
  notificationDelivered: boolean;
}

export function useRequestOwnProfileChange() {
  return useMutation({
    mutationFn: async ({ message, proposedChanges }: { message: string; proposedChanges: ProfileChangeProposal }) => {
      const { data, error } = await supabase.functions.invoke<ProfileChangeRequestResponse>('request-profile-change', {
        body: { message, proposedChanges },
      });
      if (error) throw error;
      return data;
    },
  });
}

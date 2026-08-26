import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Mark related cache entries stale and refresh every matching cached query,
 * including queries belonging to a module that is currently unmounted.
 * Refetch failures stay on the query itself and must not turn a successful
 * write into a failed mutation.
 */
export function refreshQueries(queryClient: QueryClient, queryKeys: readonly QueryKey[]) {
  queryKeys.forEach((queryKey) => {
    void queryClient
      .invalidateQueries({ queryKey, refetchType: 'all' })
      .catch(() => undefined);
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchMMR, shouldRetry } from '../api/riotApi';
import type { PlayerQuery } from '../types';

/** Current rank, RR, last RR change, act record, peak rank. */
export function useMMR(query: PlayerQuery | null) {
  return useQuery({
    queryKey: ['mmr', query?.region, query?.name?.toLowerCase(), query?.tag?.toLowerCase()],
    queryFn: () => fetchMMR(query!.region, query!.name, query!.tag),
    enabled: !!query,
    staleTime: 60_000,
    retry: shouldRetry,
  });
}

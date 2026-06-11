import { useQuery } from '@tanstack/react-query';
import { fetchMatches, fetchMatchDetail, shouldRetry } from '../api/riotApi';
import type { PlayerQuery } from '../types';

/**
 * Match history + server-computed aggregates for the last `size` matches.
 * The server returns everything pre-computed (ACS, KAST, per-agent/per-map
 * splits, RR progression) so this hook is just transport + caching.
 */
export function useMatches(query: PlayerQuery | null, size: number) {
  return useQuery({
    queryKey: ['matches', query?.region, query?.name?.toLowerCase(), query?.tag?.toLowerCase(), size],
    queryFn: () => fetchMatches(query!.region, query!.name, query!.tag, size),
    enabled: !!query,
    staleTime: 60_000,
    retry: shouldRetry,
  });
}

/** Full 10-player scoreboard — fetched lazily when a match card is expanded. */
export function useMatchDetail(region: string | null, matchId: string | null) {
  return useQuery({
    queryKey: ['match', region, matchId],
    queryFn: () => fetchMatchDetail(region!, matchId!),
    enabled: !!region && !!matchId,
    staleTime: Infinity, // finished matches never change
    retry: shouldRetry,
  });
}

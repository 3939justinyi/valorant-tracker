import { useQuery } from '@tanstack/react-query';
import { fetchAccount, fetchHealth, shouldRetry } from '../api/riotApi';
import type { PlayerQuery } from '../types';

/** Resolve a Riot ID to account info (PUUID, level, player card). */
export function usePlayer(query: PlayerQuery | null) {
  return useQuery({
    queryKey: ['account', query?.name?.toLowerCase(), query?.tag?.toLowerCase()],
    queryFn: () => fetchAccount(query!.name, query!.tag),
    enabled: !!query,
    staleTime: 120_000,
    retry: shouldRetry,
  });
}

/** Backend health + active data source (used for the DEMO DATA badge). */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: 60_000,
    retry: false,
  });
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchContent } from '../api/riotApi';
import type { ContentAgent, ContentMap, ContentTier } from '../types';

/**
 * Static game content (agent portraits, roles, map art, rank icons) served by
 * the backend from valorant-api.com. Exposes lookup helpers; every consumer
 * shares one cached query.
 */
export function useContent() {
  const query = useQuery({
    queryKey: ['content'],
    queryFn: fetchContent,
    staleTime: Infinity,
    retry: 1,
  });

  const lookups = useMemo(() => {
    const agents = new Map<string, ContentAgent>();
    const maps = new Map<string, ContentMap>();
    const tiersById = new Map<number, ContentTier>();
    for (const a of query.data?.agents ?? []) agents.set(a.name.toLowerCase(), a);
    for (const m of query.data?.maps ?? []) maps.set(m.name.toLowerCase(), m);
    for (const t of query.data?.tiers ?? []) tiersById.set(t.id, t);
    return { agents, maps, tiersById };
  }, [query.data]);

  return {
    ...query,
    agentIcon: (name: string | null | undefined) =>
      name ? lookups.agents.get(name.toLowerCase())?.icon ?? null : null,
    agentRole: (name: string | null | undefined) =>
      name ? lookups.agents.get(name.toLowerCase())?.role ?? null : null,
    mapIcon: (name: string | null | undefined) =>
      name ? lookups.maps.get(name.toLowerCase())?.icon ?? null : null,
    mapSplash: (name: string | null | undefined) =>
      name ? lookups.maps.get(name.toLowerCase())?.splash ?? null : null,
    tierIcon: (id: number | null | undefined) =>
      id != null ? lookups.tiersById.get(id)?.icon ?? null : null,
    tierColorOf: (id: number | null | undefined) =>
      id != null ? lookups.tiersById.get(id)?.color ?? null : null,
  };
}

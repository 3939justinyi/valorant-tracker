import axios from 'axios';
import { TIERS } from './tiers.js';

// Static game content (agents, maps, rank tiers) from the public
// valorant-api.com CDN — no key required. Cached in-process for 24h; on
// network failure we fall back to a names-only table so the app keeps working
// (the frontend renders letter avatars when icons are null).

const TTL_OK_MS = 24 * 60 * 60 * 1000;
const TTL_FAIL_MS = 60 * 1000;

let cache = null; // { data, expiresAt }

export async function getContent() {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  try {
    const [agentsRes, mapsRes, tiersRes] = await Promise.all([
      axios.get('https://valorant-api.com/v1/agents', {
        params: { isPlayableCharacter: true },
        timeout: 8000,
      }),
      axios.get('https://valorant-api.com/v1/maps', { timeout: 8000 }),
      axios.get('https://valorant-api.com/v1/competitivetiers', { timeout: 8000 }),
    ]);

    const agents = (agentsRes.data?.data ?? [])
      .filter((a) => a.isPlayableCharacter)
      .map((a) => ({
        uuid: a.uuid,
        name: a.displayName,
        icon: a.displayIcon ?? null,
        role: a.role?.displayName ?? null,
        roleIcon: a.role?.displayIcon ?? null,
      }));

    const maps = (mapsRes.data?.data ?? [])
      .filter((m) => m.displayName && m.mapUrl)
      .map((m) => ({
        name: m.displayName,
        mapUrl: m.mapUrl,
        icon: m.listViewIcon ?? null,
        splash: m.splash ?? null,
      }));

    // competitivetiers returns one entry per episode; the last is current.
    const episodes = tiersRes.data?.data ?? [];
    const latest = episodes[episodes.length - 1]?.tiers ?? [];
    const tiers = latest
      .filter((t) => t.tierName && !/unused/i.test(t.tierName))
      .map((t) => ({
        id: t.tier,
        name: titleCase(t.tierName),
        icon: t.largeIcon ?? t.smallIcon ?? null,
        color: t.color ? `#${String(t.color).slice(0, 6)}` : null,
      }));

    const data = { agents, maps, tiers };
    cache = { data, expiresAt: Date.now() + TTL_OK_MS };
    return data;
  } catch {
    const data = fallbackContent();
    cache = { data, expiresAt: Date.now() + TTL_FAIL_MS };
    return data;
  }
}

function fallbackContent() {
  return {
    agents: [],
    maps: [],
    tiers: TIERS.map((t) => ({ id: t.id, name: t.name, icon: null, color: null })),
  };
}

function titleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** Lookup helpers used by the official-API adapter. */
export async function getContentMaps() {
  const content = await getContent();
  return {
    agentByUuid: new Map(content.agents.map((a) => [a.uuid.toLowerCase(), a])),
    mapByUrl: new Map(content.maps.map((m) => [m.mapUrl, m])),
  };
}

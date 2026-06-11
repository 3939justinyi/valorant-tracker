import { riotGet, shardFor, ACCOUNT_ROUTE } from './riotClient.js';
import { buildMatchStats, deriveRoundStats } from './statCalculator.js';
import { tierNameById } from './tiers.js';
import { getContentMaps } from './contentProvider.js';

// Adapter for the official Riot Games API. Requires RIOT_API_KEY (dev keys
// expire every 24h; production VAL-MATCH access needs an approved product).
//
// Caveat baked into the design: the official API has no per-player MMR
// endpoint (only Immortal+ leaderboards), so getMMR returns an
// `unavailable` payload and the UI degrades gracefully.

const enc = encodeURIComponent;

export async function getAccount({ name, tag }) {
  const d = await riotGet(
    ACCOUNT_ROUTE,
    `/riot/account/v1/accounts/by-riot-id/${enc(name)}/${enc(tag)}`
  );
  return {
    puuid: d.puuid,
    name: d.gameName ?? name,
    tag: d.tagLine ?? tag,
    region: null,
    accountLevel: null, // not exposed by account-v1
    card: { small: null, wide: null },
  };
}

export async function getMMR({ region, name, tag }) {
  return {
    name,
    tag,
    region,
    unavailable: true,
    reason:
      'The official Riot API only exposes ranked standings via Immortal+ leaderboards. ' +
      'Set HENRIK_API_KEY (DATA_SOURCE=henrik) for full MMR data.',
    current: { tier: { id: null, name: null }, rr: null, lastChange: null, elo: null },
    peak: { tier: { id: null, name: null }, season: null },
    act: { wins: null, losses: null, games: null, winRate: null },
  };
}

export async function getMatches({ region, name, tag, size, queue }) {
  const { puuid } = await getAccount({ name, tag });
  const shard = shardFor(region);
  const list = await riotGet(shard, `/val/match/v1/matchlists/by-puuid/${enc(puuid)}`);

  let history = list?.history ?? [];
  if (queue && queue !== 'all') history = history.filter((h) => h.queueId === queue);
  history = history.slice(0, size);

  const matches = await Promise.all(
    history.map((h) =>
      riotGet(shard, `/val/match/v1/matches/${enc(h.matchId)}`)
        .then((m) => normalizeMatch(m, puuid, region))
        .catch(() => null)
    )
  );
  return matches.filter(Boolean);
}

export async function getMatchDetail({ region, matchId }) {
  const shard = shardFor(region);
  const m = await riotGet(shard, `/val/match/v1/matches/${enc(matchId)}`);
  return normalizeDetail(m, region);
}

// ── normalization ────────────────────────────────────────────────────────────

async function normalizeMatch(m, puuid, region) {
  const info = m.matchInfo ?? {};
  const players = m.players ?? [];
  const me = players.find((p) => p.puuid === puuid);
  if (!me) return null;

  const myTeam = (m.teams ?? []).find((t) => t.teamId === me.teamId) ?? {};
  const enemyTeam = (m.teams ?? []).find((t) => t.teamId !== me.teamId) ?? {};
  const roundsWon = myTeam.roundsWon ?? 0;
  const roundsLost = enemyTeam.roundsWon ?? 0;
  const roundsPlayed = me.stats?.roundsPlayed ?? (m.roundResults ?? []).length;
  const result = myTeam.won ? 'win' : roundsWon === roundsLost ? 'draw' : 'loss';

  const damage = sumDamage(m, puuid);
  const teammates = players.filter((p) => p.teamId === me.teamId).map((p) => p.puuid);
  const enemies = players.filter((p) => p.teamId !== me.teamId).map((p) => p.puuid);
  const derived = deriveRoundStats(buildRoundEvents(m), {
    puuid,
    playerTeam: me.teamId,
    teammates,
    enemies,
  });

  const { agentByUuid, mapByUrl } = await getContentMaps();
  const agent = agentByUuid.get(String(me.characterId ?? '').toLowerCase());
  const map = mapByUrl.get(info.mapId);

  return {
    matchId: info.matchId ?? m.matchInfo?.matchId,
    region,
    queue: info.queueId ?? 'competitive',
    mode: info.queueId ?? 'Competitive',
    map: map?.name ?? info.mapId ?? 'Unknown',
    startedAt: new Date(info.gameStartMillis ?? 0).toISOString(),
    lengthMs: info.gameLengthMillis ?? null,
    result,
    roundsPlayed,
    roundsWon,
    roundsLost,
    score: `${roundsWon}-${roundsLost}`,
    agent: { name: agent?.name ?? 'Unknown', iconUrl: agent?.icon ?? null },
    tier: { id: me.competitiveTier ?? null, name: tierNameById(me.competitiveTier) },
    rr: { change: null, after: null, eloAfter: null }, // no MMR history on official API
    stats: buildMatchStats({
      kills: me.stats?.kills ?? 0,
      deaths: me.stats?.deaths ?? 0,
      assists: me.stats?.assists ?? 0,
      combatScore: me.stats?.score ?? 0,
      totalDamage: damage.total,
      headshots: damage.head,
      bodyshots: damage.body,
      legshots: damage.leg,
      roundsPlayed,
      ...derived,
    }),
  };
}

async function normalizeDetail(m, region) {
  const info = m.matchInfo ?? {};
  const teams = m.teams ?? [];
  const red = teams.find((t) => t.teamId === 'Red') ?? {};
  const blue = teams.find((t) => t.teamId === 'Blue') ?? {};
  const roundsPlayed = (m.roundResults ?? []).length;
  const { agentByUuid, mapByUrl } = await getContentMaps();

  return {
    matchId: info.matchId,
    map: mapByUrl.get(info.mapId)?.name ?? info.mapId ?? 'Unknown',
    mode: info.queueId ?? 'Competitive',
    queue: info.queueId ?? 'competitive',
    startedAt: new Date(info.gameStartMillis ?? 0).toISOString(),
    lengthMs: info.gameLengthMillis ?? null,
    roundsPlayed,
    teams: {
      red: { roundsWon: red.roundsWon ?? 0, won: !!red.won },
      blue: { roundsWon: blue.roundsWon ?? 0, won: !!blue.won },
    },
    players: (m.players ?? []).map((p) => {
      const damage = sumDamage(m, p.puuid);
      const hits = damage.head + damage.body + damage.leg;
      const agent = agentByUuid.get(String(p.characterId ?? '').toLowerCase());
      return {
        puuid: p.puuid,
        name: p.gameName ?? 'Unknown',
        tag: p.tagLine ?? '',
        team: p.teamId ?? 'Red',
        agent: { name: agent?.name ?? 'Unknown', iconUrl: agent?.icon ?? null },
        tier: { id: p.competitiveTier ?? null, name: tierNameById(p.competitiveTier) },
        stats: {
          kills: p.stats?.kills ?? 0,
          deaths: p.stats?.deaths ?? 0,
          assists: p.stats?.assists ?? 0,
          combatScore: p.stats?.score ?? 0,
          acs: roundsPlayed > 0 ? Math.round((p.stats?.score ?? 0) / roundsPlayed) : 0,
          adr: roundsPlayed > 0 ? Math.round(damage.total / roundsPlayed) : 0,
          hsPercent: hits > 0 ? Math.round((damage.head / hits) * 1000) / 1000 : null,
        },
      };
    }),
  };
}

function sumDamage(m, puuid) {
  let total = 0;
  let head = 0;
  let body = 0;
  let leg = 0;
  for (const round of m.roundResults ?? []) {
    const ps = (round.playerStats ?? []).find((s) => s.puuid === puuid);
    for (const d of ps?.damage ?? []) {
      total += d.damage ?? 0;
      head += d.headshots ?? 0;
      body += d.bodyshots ?? 0;
      leg += d.legshots ?? 0;
    }
  }
  return { total, head, body, leg };
}

function buildRoundEvents(m) {
  return (m.roundResults ?? []).map((round) => {
    const kills = [];
    for (const ps of round.playerStats ?? []) {
      for (const k of ps.kills ?? []) {
        kills.push({
          killer: k.killer ?? ps.puuid,
          victim: k.victim,
          assistants: k.assistants ?? [],
          timeMs: k.timeSinceRoundStartMillis ?? 0,
        });
      }
    }
    return { winningTeam: round.winningTeam ?? null, kills };
  });
}

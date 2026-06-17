import { henrikGet } from './riotClient.js';
import { buildMatchStats, deriveRoundStats } from './statCalculator.js';
import { ApiError } from './errors.js';

// Adapter for the unofficial HenrikDev API (https://docs.henrikdev.xyz).
// Great for prototyping; swap DATA_SOURCE=riot for the official API at launch.

const enc = encodeURIComponent;

export async function getAccount({ name, tag }) {
  const res = await henrikGet(`/valorant/v1/account/${enc(name)}/${enc(tag)}`);
  const d = res?.data ?? {};
  return {
    puuid: d.puuid ?? null,
    name: d.name ?? name,
    tag: d.tag ?? tag,
    region: d.region ?? null,
    accountLevel: d.account_level ?? null,
    card: { small: d.card?.small ?? null, wide: d.card?.wide ?? null },
  };
}

export async function getMMR({ region, name, tag }) {
  const res = await henrikGet(`/valorant/v2/mmr/${region}/${enc(name)}/${enc(tag)}`);
  const d = res?.data ?? {};
  const cur = d.current_data ?? {};
  const peak = d.highest_rank ?? {};

  // by_season keys look like "e9a2" — pick the most recent act with games.
  let act = { wins: null, losses: null, games: null, winRate: null };
  const seasons = Object.entries(d.by_season ?? {})
    .filter(([, v]) => v && !v.error && v.number_of_games > 0)
    .map(([k, v]) => {
      const m = /^e(\d+)a(\d+)$/.exec(k);
      return { order: m ? parseInt(m[1], 10) * 10 + parseInt(m[2], 10) : 0, ...v };
    })
    .sort((a, b) => b.order - a.order);
  if (seasons.length) {
    const s = seasons[0];
    const losses = Math.max(0, (s.number_of_games ?? 0) - (s.wins ?? 0));
    act = {
      wins: s.wins ?? null,
      losses,
      games: s.number_of_games ?? null,
      winRate: s.number_of_games ? Math.round(((s.wins ?? 0) / s.number_of_games) * 1000) / 1000 : null,
    };
  }

  return {
    name: d.name ?? name,
    tag: d.tag ?? tag,
    region,
    current: {
      tier: { id: cur.currenttier ?? null, name: cur.currenttierpatched ?? null },
      rr: cur.ranking_in_tier ?? null,
      lastChange: cur.mmr_change_to_last_game ?? null,
      elo: cur.elo ?? null,
    },
    peak: {
      tier: { id: peak.tier ?? null, name: peak.patched_tier ?? null },
      season: peak.season ?? null,
    },
    act,
  };
}

export async function getMatches({ region, name, tag, size, queue }) {
  const wantAll = !queue || queue === 'all';
  // Always pull the max page (henrik v3 caps at 10) and filter by mode
  // ourselves. The upstream mode filter is unreliable — it silently returns
  // every mode — so without this, Deathmatch/Team Deathmatch leak in. Those
  // modes report rounds_played=1, which makes ACS (combatScore / rounds)
  // explode into the thousands.
  const params = { size: 10 };
  if (!wantAll) params.mode = queue; // best-effort upstream hint

  const [matchesRes, historyRes] = await Promise.all([
    henrikGet(`/valorant/v3/matches/${region}/${enc(name)}/${enc(tag)}`, params),
    // RR deltas come from the separate mmr-history endpoint; best-effort join.
    henrikGet(`/valorant/v1/mmr-history/${region}/${enc(name)}/${enc(tag)}`).catch(() => null),
  ]);

  const rrByMatch = new Map(
    (historyRes?.data ?? []).filter((h) => h?.match_id).map((h) => [h.match_id, h])
  );

  let matches = (matchesRes?.data ?? [])
    .map((m) => normalizeMatch(m, { name, tag, region, rrByMatch }))
    .filter(Boolean);

  if (!wantAll) {
    const want = queue.toLowerCase();
    matches = matches.filter((m) => String(m.queue).toLowerCase() === want);
  }
  return matches.slice(0, size);
}

export async function getMatchDetail({ region, matchId }) {
  const res = await henrikGet(`/valorant/v2/match/${enc(matchId)}`);
  const m = res?.data;
  if (!m) throw new ApiError(404, 'MATCH_NOT_FOUND', 'Match not found.');

  const meta = m.metadata ?? {};
  const teams = m.teams ?? {};
  const roundsPlayed = meta.rounds_played ?? (teams.red?.rounds_won ?? 0) + (teams.blue?.rounds_won ?? 0);

  return {
    matchId: meta.matchid ?? matchId,
    map: meta.map ?? 'Unknown',
    mode: meta.mode ?? 'Competitive',
    queue: meta.mode_id ?? meta.mode ?? 'competitive',
    startedAt: toIso(meta.game_start),
    lengthMs: toMs(meta.game_length),
    roundsPlayed,
    teams: {
      red: { roundsWon: teams.red?.rounds_won ?? 0, won: !!teams.red?.has_won },
      blue: { roundsWon: teams.blue?.rounds_won ?? 0, won: !!teams.blue?.has_won },
    },
    players: (m.players?.all_players ?? []).map((p) => scoreboardPlayer(p, roundsPlayed)),
  };
}

// ── normalization helpers ────────────────────────────────────────────────────

function normalizeMatch(m, { name, tag, region, rrByMatch }) {
  const players = m.players?.all_players ?? [];
  const me = players.find(
    (p) =>
      p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase()
  );
  if (!me) return null;

  const meta = m.metadata ?? {};
  const teams = m.teams ?? {};
  const myTeamKey = String(me.team ?? '').toLowerCase(); // 'red' | 'blue'
  const myTeam = teams[myTeamKey] ?? {};
  const roundsWon = myTeam.rounds_won ?? 0;
  const roundsLost = myTeam.rounds_lost ?? 0;
  const roundsPlayed = meta.rounds_played ?? roundsWon + roundsLost;

  const result = myTeam.has_won ? 'win' : roundsWon === roundsLost ? 'draw' : 'loss';

  const teammates = players.filter((p) => p.team === me.team).map((p) => p.puuid);
  const enemies = players.filter((p) => p.team !== me.team).map((p) => p.puuid);
  const derived = deriveRoundStats(buildRoundEvents(m), {
    puuid: me.puuid,
    playerTeam: me.team,
    teammates,
    enemies,
  });

  const rr = rrByMatch.get(meta.matchid);

  return {
    matchId: meta.matchid,
    region,
    queue: meta.mode_id ?? 'competitive',
    mode: meta.mode ?? 'Competitive',
    map: meta.map ?? 'Unknown',
    startedAt: toIso(meta.game_start),
    lengthMs: toMs(meta.game_length),
    result,
    roundsPlayed,
    roundsWon,
    roundsLost,
    score: `${roundsWon}-${roundsLost}`,
    agent: { name: me.character ?? 'Unknown', iconUrl: me.assets?.agent?.small ?? null },
    tier: { id: me.currenttier ?? null, name: me.currenttier_patched ?? null },
    rr: {
      change: rr?.mmr_change_to_last_game ?? null,
      after: rr?.ranking_in_tier ?? null,
      eloAfter: rr?.elo ?? null,
    },
    stats: buildMatchStats({
      kills: me.stats?.kills ?? 0,
      deaths: me.stats?.deaths ?? 0,
      assists: me.stats?.assists ?? 0,
      combatScore: me.stats?.score ?? 0,
      totalDamage: me.damage_made ?? 0,
      headshots: me.stats?.headshots ?? 0,
      bodyshots: me.stats?.bodyshots ?? 0,
      legshots: me.stats?.legshots ?? 0,
      roundsPlayed,
      ...derived,
    }),
  };
}

/** Convert henrik rounds/kills into the neutral timeline deriveRoundStats expects. */
function buildRoundEvents(m) {
  const rounds = m.rounds ?? [];
  if (!rounds.length) return [];

  // Prefer the flat top-level kills array (has a `round` index); fall back to
  // collecting kill_events from each round's player_stats.
  const byRound = new Map();
  const push = (idx, k) => {
    if (!byRound.has(idx)) byRound.set(idx, []);
    byRound.get(idx).push({
      killer: k.killer_puuid,
      victim: k.victim_puuid,
      assistants: (k.assistants ?? []).map((a) => a.assistant_puuid).filter(Boolean),
      timeMs: k.kill_time_in_round ?? 0,
    });
  };

  if (Array.isArray(m.kills) && m.kills.length) {
    for (const k of m.kills) push(k.round ?? 0, k);
  } else {
    rounds.forEach((r, idx) => {
      for (const ps of r.player_stats ?? []) {
        for (const k of ps.kill_events ?? []) push(idx, k);
      }
    });
  }

  return rounds.map((r, idx) => ({
    winningTeam: r.winning_team ?? null,
    kills: byRound.get(idx) ?? [],
  }));
}

function scoreboardPlayer(p, roundsPlayed) {
  const head = p.stats?.headshots ?? 0;
  const body = p.stats?.bodyshots ?? 0;
  const leg = p.stats?.legshots ?? 0;
  const hits = head + body + leg;
  return {
    puuid: p.puuid ?? '',
    name: p.name ?? 'Unknown',
    tag: p.tag ?? '',
    team: p.team ?? 'Red',
    agent: { name: p.character ?? 'Unknown', iconUrl: p.assets?.agent?.small ?? null },
    tier: { id: p.currenttier ?? null, name: p.currenttier_patched ?? null },
    stats: {
      kills: p.stats?.kills ?? 0,
      deaths: p.stats?.deaths ?? 0,
      assists: p.stats?.assists ?? 0,
      combatScore: p.stats?.score ?? 0,
      acs: roundsPlayed > 0 ? Math.round((p.stats?.score ?? 0) / roundsPlayed) : 0,
      adr: roundsPlayed > 0 ? Math.round((p.damage_made ?? 0) / roundsPlayed) : 0,
      hsPercent: hits > 0 ? Math.round((head / hits) * 1000) / 1000 : null,
    },
  };
}

function toIso(unixSeconds) {
  if (!unixSeconds) return new Date(0).toISOString();
  return new Date(unixSeconds * 1000).toISOString();
}

function toMs(gameLength) {
  if (gameLength == null) return null;
  // henrik reports seconds in some versions, ms in others — disambiguate.
  return gameLength < 100_000 ? gameLength * 1000 : gameLength;
}

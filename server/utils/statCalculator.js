// Pure stat math. Everything here operates on normalized match objects (see
// adapters) so the frontend receives pre-computed numbers and never does
// heavy aggregation itself.

export const kdaRatio = (kills, deaths, assists) => (kills + assists) / Math.max(1, deaths);

export const kdRatio = (kills, deaths) => kills / Math.max(1, deaths);

export const acs = (combatScore, roundsPlayed) => (roundsPlayed > 0 ? combatScore / roundsPlayed : 0);

export const adr = (totalDamage, roundsPlayed) => (roundsPlayed > 0 ? totalDamage / roundsPlayed : 0);

export function hsPercent(headshots, bodyshots, legshots) {
  const total = headshots + bodyshots + legshots;
  return total > 0 ? headshots / total : null;
}

export function winRate(wins, losses, draws = 0) {
  const games = wins + losses + draws;
  return games > 0 ? wins / games : null;
}

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Derive round-event stats (first bloods, KAST, clutches) from a neutral
 * kill-event timeline. Both the Henrik and official Riot adapters convert
 * their raw payloads into this shape:
 *
 * rounds: [{ winningTeam: 'Red'|'Blue', kills: [{ killer, victim, assistants: [puuid], timeMs }] }]
 */
export function deriveRoundStats(rounds, { puuid, playerTeam, teammates, enemies }) {
  if (!rounds?.length) {
    return { firstBloods: null, kastRounds: null, kastPercent: null, clutchesWon: null, clutchesAttempted: null };
  }

  const TRADE_WINDOW_MS = 5_000;
  let firstBloods = 0;
  let kastRounds = 0;
  let clutchesWon = 0;
  let clutchesAttempted = 0;

  for (const round of rounds) {
    const kills = [...(round.kills ?? [])].sort((a, b) => a.timeMs - b.timeMs);

    if (kills.length && kills[0].killer === puuid) firstBloods += 1;

    // KAST: Kill, Assist, Survived, or Traded
    const gotKill = kills.some((k) => k.killer === puuid);
    const gotAssist = kills.some((k) => (k.assistants ?? []).includes(puuid));
    const myDeath = kills.find((k) => k.victim === puuid);
    const survived = !myDeath;
    const traded =
      !!myDeath &&
      kills.some(
        (k) =>
          k.victim === myDeath.killer &&
          k.timeMs >= myDeath.timeMs &&
          k.timeMs - myDeath.timeMs <= TRADE_WINDOW_MS
      );
    if (gotKill || gotAssist || survived || traded) kastRounds += 1;

    // Clutch: the moment the player becomes the last teammate alive with at
    // least one enemy still up, it's an attempt; won if their team takes the round.
    const deadTeammates = new Set();
    const deadEnemies = new Set();
    let inClutch = false;
    for (const k of kills) {
      if (teammates.includes(k.victim)) deadTeammates.add(k.victim);
      else if (enemies.includes(k.victim)) deadEnemies.add(k.victim);
      if (
        !inClutch &&
        !deadTeammates.has(puuid) &&
        deadTeammates.size === teammates.length - 1 &&
        enemies.length - deadEnemies.size >= 1
      ) {
        inClutch = true;
      }
    }
    if (inClutch) {
      clutchesAttempted += 1;
      if (round.winningTeam === playerTeam) clutchesWon += 1;
    }
  }

  return {
    firstBloods,
    kastRounds,
    kastPercent: round3(kastRounds / rounds.length),
    clutchesWon,
    clutchesAttempted,
  };
}

/** Build per-match stat block from raw totals (shared by all adapters). */
export function buildMatchStats(raw) {
  const { kills, deaths, assists, combatScore, totalDamage, headshots, bodyshots, legshots, roundsPlayed } = raw;
  return {
    kills,
    deaths,
    assists,
    combatScore,
    acs: Math.round(acs(combatScore, roundsPlayed)),
    kd: round2(kdRatio(kills, deaths)),
    kda: round2(kdaRatio(kills, deaths, assists)),
    totalDamage,
    adr: Math.round(adr(totalDamage, roundsPlayed)),
    headshots,
    bodyshots,
    legshots,
    hsPercent: roundOrNull3(hsPercent(headshots, bodyshots, legshots)),
    firstBloods: raw.firstBloods ?? null,
    kastRounds: raw.kastRounds ?? null,
    kastPercent: raw.kastPercent ?? null,
    clutchesWon: raw.clutchesWon ?? null,
    clutchesAttempted: raw.clutchesAttempted ?? null,
  };
}

const roundOrNull3 = (n) => (n == null ? null : round3(n));

/** Aggregate a list of normalized MatchSummary objects into dashboard stats. */
export function aggregateMatches(matches) {
  const agg = {
    matches: matches.length,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    kda: null,
    kd: null,
    acs: null,
    adr: null,
    hsPercent: null,
    kastPercent: null,
    firstBloods: null,
    firstBloodsPerMatch: null,
    clutchesWon: 0,
    clutchesAttempted: 0,
    agents: [],
    maps: [],
    progression: [],
  };
  if (!matches.length) return agg;

  let rounds = 0;
  let combatScore = 0;
  let damage = 0;
  let head = 0;
  let body = 0;
  let leg = 0;
  let kastRounds = 0;
  let kastEligibleRounds = 0;
  let fbTotal = 0;
  let fbMatches = 0;

  const byAgent = new Map();
  const byMap = new Map();

  for (const m of matches) {
    if (m.result === 'win') agg.wins += 1;
    else if (m.result === 'loss') agg.losses += 1;
    else agg.draws += 1;

    const s = m.stats;
    agg.kills += s.kills;
    agg.deaths += s.deaths;
    agg.assists += s.assists;
    rounds += m.roundsPlayed;
    combatScore += s.combatScore;
    damage += s.totalDamage;
    head += s.headshots;
    body += s.bodyshots;
    leg += s.legshots;
    if (s.kastRounds != null) {
      kastRounds += s.kastRounds;
      kastEligibleRounds += m.roundsPlayed;
    }
    if (s.firstBloods != null) {
      fbTotal += s.firstBloods;
      fbMatches += 1;
    }
    agg.clutchesWon += s.clutchesWon ?? 0;
    agg.clutchesAttempted += s.clutchesAttempted ?? 0;

    bump(byAgent, m.agent.name, m, { iconUrl: m.agent.iconUrl });
    bump(byMap, m.map, m, {});
  }

  agg.winRate = round3(winRate(agg.wins, agg.losses, agg.draws));
  agg.kda = round2(kdaRatio(agg.kills, agg.deaths, agg.assists));
  agg.kd = round2(kdRatio(agg.kills, agg.deaths));
  agg.acs = Math.round(acs(combatScore, rounds));
  agg.adr = Math.round(adr(damage, rounds));
  agg.hsPercent = roundOrNull3(hsPercent(head, body, leg));
  agg.kastPercent = kastEligibleRounds > 0 ? round3(kastRounds / kastEligibleRounds) : null;
  agg.firstBloods = fbMatches > 0 ? fbTotal : null;
  agg.firstBloodsPerMatch = fbMatches > 0 ? round2(fbTotal / fbMatches) : null;

  agg.agents = [...byAgent.values()].map(finishGroup).sort((a, b) => b.matches - a.matches);
  agg.maps = [...byMap.values()].map(finishGroup).sort((a, b) => b.matches - a.matches);

  agg.progression = matches
    .filter((m) => m.rr?.eloAfter != null)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .map((m) => ({
      matchId: m.matchId,
      date: m.startedAt,
      result: m.result,
      rrChange: m.rr.change,
      rrAfter: m.rr.after,
      eloAfter: m.rr.eloAfter,
      tierName: m.tier?.name ?? null,
    }));

  return agg;
}

function bump(map, key, match, extra) {
  if (!key) return;
  if (!map.has(key)) {
    map.set(key, {
      name: key,
      ...extra,
      matches: 0,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      combatScore: 0,
      rounds: 0,
    });
  }
  const g = map.get(key);
  g.matches += 1;
  if (match.result === 'win') g.wins += 1;
  else if (match.result === 'loss') g.losses += 1;
  g.kills += match.stats.kills;
  g.deaths += match.stats.deaths;
  g.assists += match.stats.assists;
  g.combatScore += match.stats.combatScore;
  g.rounds += match.roundsPlayed;
}

function finishGroup(g) {
  const { combatScore, rounds, kills, deaths, assists, ...rest } = g;
  return {
    ...rest,
    winRate: round3(winRate(g.wins, g.losses, g.matches - g.wins - g.losses)) ?? 0,
    acs: Math.round(acs(combatScore, rounds)),
    kda: round2(kdaRatio(kills, deaths, assists)),
  };
}

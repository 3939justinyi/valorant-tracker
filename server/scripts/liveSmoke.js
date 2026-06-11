// Live smoke test for the HenrikDev adapter. Run from server/:
//   node scripts/liveSmoke.js
// Grabs a real player from the NA leaderboard, then exercises every adapter
// function and prints the normalized output so payload drift is obvious.
import 'dotenv/config';
import { henrikGet } from '../utils/riotClient.js';
import * as henrik from '../utils/henrikAdapter.js';

if (!process.env.HENRIK_API_KEY) {
  console.error('HENRIK_API_KEY missing — create server/.env first.');
  process.exit(1);
}

const lb = await henrikGet('/valorant/v1/leaderboard/na');
const entries = Array.isArray(lb) ? lb : lb?.data ?? [];
const player = entries.find((e) => e.gameName && e.tagLine);
if (!player) {
  console.error('No non-anonymized player found on the leaderboard payload:', Object.keys(lb ?? {}));
  process.exit(1);
}
console.log(`test player: ${player.gameName}#${player.tagLine} (leaderboard #${player.leaderboardRank ?? '?'})`);

const account = await henrik.getAccount({ name: player.gameName, tag: player.tagLine });
console.log('account  →', {
  puuid: account.puuid?.slice(0, 8) + '…',
  region: account.region,
  level: account.accountLevel,
  hasCard: !!account.card.small,
});

const region = account.region ?? 'na';

const mmr = await henrik.getMMR({ region, name: player.gameName, tag: player.tagLine });
console.log('mmr      →', {
  tier: mmr.current.tier,
  rr: mmr.current.rr,
  lastChange: mmr.current.lastChange,
  elo: mmr.current.elo,
  peak: mmr.peak,
  act: mmr.act,
});

const matches = await henrik.getMatches({
  region,
  name: player.gameName,
  tag: player.tagLine,
  size: 5,
  queue: 'competitive',
});
console.log(`matches  → ${matches.length} normalized`);
for (const m of matches.slice(0, 3)) {
  console.log('  ', {
    map: m.map,
    agent: m.agent.name,
    result: m.result,
    score: m.score,
    acs: m.stats.acs,
    adr: m.stats.adr,
    hs: m.stats.hsPercent,
    kast: m.stats.kastPercent,
    fb: m.stats.firstBloods,
    clutch: `${m.stats.clutchesWon}/${m.stats.clutchesAttempted}`,
    rr: m.rr,
    started: m.startedAt,
    lengthMs: m.lengthMs,
  });
}

if (matches[0]) {
  const detail = await henrik.getMatchDetail({ region, matchId: matches[0].matchId });
  console.log('detail   →', {
    map: detail.map,
    rounds: detail.roundsPlayed,
    teams: detail.teams,
    players: detail.players.length,
    topAcs: detail.players.map((p) => p.stats.acs).sort((a, b) => b - a)[0],
  });
}

console.log('\nlive smoke: OK');

import { ApiError } from './errors.js';
import { tierForElo, eloToRR } from './tiers.js';
import { buildMatchStats } from './statCalculator.js';

// Deterministic demo data source — no API keys needed. The same Riot ID
// always produces the same profile (stats are seeded from the name#tag), so
// the app is fully demoable offline and in CI.

const MATCH_COUNT = 20;

const AGENTS = [
  'Jett', 'Raze', 'Reyna', 'Neon', 'Yoru', 'Phoenix', 'Iso',
  'Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock',
  'Sova', 'Fade', 'Skye', 'Breach', 'KAY/O', 'Gekko',
  'Omen', 'Viper', 'Brimstone', 'Astra', 'Harbor', 'Clove',
];
const MAPS = ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Icebox', 'Pearl'];
const BOT_NAMES = [
  'WhiffKing', 'LurkMaster', 'SiteAnchor', 'OneTapWonder', 'EcoFraud', 'SmokeCriminal',
  'FlashedAgain', 'BaitedHard', 'DriftQueen', 'NoScopeNico', 'CryptoSova', 'PixelPeek',
  'RunItBack', 'ThriftyWin', 'AceHunter', 'SpikeRat', 'JigglePeek', 'UtilBot',
];
const BOT_TAGS = ['NA1', 'MAIN', 'TTV', 'AIM', 'TILT', 'LFT', 'EUW', 'GGEZ'];
const DEFAULT_CARD = '9fb348bc-41a0-91ad-8a3e-818035c4e561';

// hash36 → identity, so match details can be regenerated from a matchId alone.
const identities = new Map();

// ── PRNG ─────────────────────────────────────────────────────────────────────
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const range = (rng, min, max) => min + rng() * (max - min);
const irange = (rng, min, max) => Math.floor(range(rng, min, max + 1));
function shuffled(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── seed helpers ─────────────────────────────────────────────────────────────
const seedBaseOf = (name, tag) => `${String(name).toLowerCase()}#${String(tag).toLowerCase()}`;
const hash36Of = (seedBase) => djb2(seedBase).toString(36);

function remember(name, tag) {
  const seedBase = seedBaseOf(name, tag);
  identities.set(hash36Of(seedBase), { name, tag, seedBase });
  return seedBase;
}

function favoriteAgents(seedBase) {
  const rng = mulberry32(djb2(`${seedBase}::prefs`));
  return shuffled(rng, AGENTS).slice(0, 3);
}

function skillOf(seedBase) {
  return 0.85 + (djb2(`${seedBase}::skill`) % 40) / 100; // 0.85 – 1.24
}

// ── per-match core (everything except the RR walk) ───────────────────────────
function generateCore(seedBase, index) {
  const mseed = djb2(`${seedBase}::match::${index}`);
  const rng = mulberry32(mseed);
  const skill = skillOf(seedBase);

  const win = rng() < 0.44 + Math.min(0.18, (skill - 0.85) * 0.5);
  const overtime = rng() < 0.08;
  const loserRounds = overtime ? 12 : irange(rng, 3, 11);
  const winnerRounds = overtime ? 14 : 13;
  const roundsWon = win ? winnerRounds : loserRounds;
  const roundsLost = win ? loserRounds : winnerRounds;
  const roundsPlayed = roundsWon + roundsLost;

  const favorites = favoriteAgents(seedBase);
  const agent = rng() < 0.72 ? pick(rng, favorites) : pick(rng, AGENTS);
  const map = pick(rng, MAPS);

  const kills = Math.max(3, Math.round(roundsPlayed * range(rng, 0.55, 1.0) * skill));
  const deaths = Math.max(2, Math.round(roundsPlayed * range(rng, 0.5, 0.85)));
  const assists = irange(rng, 1, 9);
  const acsVal = Math.round((kills / roundsPlayed) * 165 + range(rng, 35, 85));
  const combatScore = acsVal * roundsPlayed;
  const totalDamage = Math.round(acsVal * range(rng, 0.58, 0.68) * roundsPlayed);
  const hits = kills * 4 + irange(rng, 0, 14);
  const headshots = Math.max(1, Math.round(hits * range(rng, 0.12, 0.36)));
  const legshots = Math.round(hits * range(rng, 0.02, 0.08));
  const bodyshots = Math.max(0, hits - headshots - legshots);

  const firstBloods = irange(rng, 0, Math.min(5, Math.ceil(kills / 5)));
  const kastRounds = Math.round(roundsPlayed * range(rng, 0.58, 0.86));
  const clutchesAttempted = irange(rng, 0, 3);
  const clutchesWon = clutchesAttempted === 0 ? 0 : irange(rng, 0, clutchesAttempted);

  const lengthMs = Math.round(roundsPlayed * range(rng, 80, 110)) * 1000;
  const startedAt = new Date(
    Date.now() - (index + 1) * 9.5 * 3_600_000 - irange(rng, 0, 4) * 3_600_000
  ).toISOString();
  const playerTeam = rng() < 0.5 ? 'Red' : 'Blue';

  return {
    mseed,
    index,
    win,
    overtime,
    map,
    agent,
    roundsWon,
    roundsLost,
    roundsPlayed,
    playerTeam,
    lengthMs,
    startedAt,
    raw: {
      kills, deaths, assists, combatScore, totalDamage,
      headshots, bodyshots, legshots, roundsPlayed,
      firstBloods, kastRounds,
      kastPercent: Math.round((kastRounds / roundsPlayed) * 1000) / 1000,
      clutchesWon, clutchesAttempted,
    },
  };
}

// ── RR random walk across the full history (oldest → newest) ─────────────────
function computeWalk(seedBase) {
  const baseElo = 450 + (djb2(`${seedBase}::elo`) % 1700); // Iron 3 – Immortal
  const cores = Array.from({ length: MATCH_COUNT }, (_, i) => generateCore(seedBase, i));

  let elo = baseElo;
  const walk = [];
  for (let i = MATCH_COUNT - 1; i >= 0; i--) {
    const rng = mulberry32(djb2(`${seedBase}::walk::${i}`));
    const core = cores[i];
    const rrChange = core.win ? irange(rng, 13, 24) : -irange(rng, 11, 22);
    elo = Math.max(0, elo + rrChange);
    walk[i] = { core, rrChange, eloAfter: elo };
  }
  return { baseElo, walk };
}

function toSummary(seedBase, { core, rrChange, eloAfter }) {
  const tier = tierForElo(eloAfter);
  return {
    matchId: `mock-${hash36Of(seedBase)}-${core.index}`,
    region: 'na',
    queue: 'competitive',
    mode: 'Competitive',
    map: core.map,
    startedAt: core.startedAt,
    lengthMs: core.lengthMs,
    result: core.win ? 'win' : 'loss',
    roundsPlayed: core.roundsPlayed,
    roundsWon: core.roundsWon,
    roundsLost: core.roundsLost,
    score: `${core.roundsWon}-${core.roundsLost}`,
    agent: { name: core.agent, iconUrl: null }, // client resolves icons via /api/content
    tier,
    rr: { change: rrChange, after: eloToRR(eloAfter), eloAfter },
    stats: buildMatchStats(core.raw),
  };
}

// ── adapter interface ────────────────────────────────────────────────────────
export async function getAccount({ name, tag }) {
  const seedBase = remember(name, tag);
  const rng = mulberry32(djb2(`${seedBase}::acct`));
  return {
    puuid: `mock-puuid-${hash36Of(seedBase)}`,
    name,
    tag,
    region: 'na',
    accountLevel: irange(rng, 40, 480),
    card: {
      small: `https://media.valorant-api.com/playercards/${DEFAULT_CARD}/smallart.png`,
      wide: `https://media.valorant-api.com/playercards/${DEFAULT_CARD}/wideart.png`,
    },
  };
}

export async function getMMR({ region, name, tag }) {
  const seedBase = remember(name, tag);
  const rng = mulberry32(djb2(`${seedBase}::mmr`));
  const { walk } = computeWalk(seedBase);
  const newest = walk[0];
  const tier = tierForElo(newest.eloAfter);

  const wins = walk.filter((w) => w.core.win).length;
  const losses = MATCH_COUNT - wins;
  const peakElo = Math.max(...walk.map((w) => w.eloAfter)) + irange(rng, 0, 120);
  const peakTier = tierForElo(peakElo);

  return {
    name,
    tag,
    region,
    current: {
      tier,
      rr: eloToRR(newest.eloAfter),
      lastChange: newest.rrChange,
      elo: newest.eloAfter,
    },
    peak: { tier: peakTier, season: pick(rng, ['e9a1', 'e9a2', 'e9a3', 'e10a1']) },
    act: {
      wins,
      losses,
      games: MATCH_COUNT,
      winRate: Math.round((wins / MATCH_COUNT) * 1000) / 1000,
    },
  };
}

export async function getMatches({ region, name, tag, size }) {
  const seedBase = remember(name, tag);
  const { walk } = computeWalk(seedBase);
  return walk.slice(0, Math.min(size, MATCH_COUNT)).map((w) => toSummary(seedBase, w));
}

export async function getMatchDetail({ matchId }) {
  const m = /^mock-([a-z0-9]+)-(\d+)$/.exec(String(matchId));
  if (!m) throw new ApiError(404, 'MATCH_NOT_FOUND', 'Unknown mock match id.');
  const identity = identities.get(m[1]);
  if (!identity) {
    throw new ApiError(404, 'MATCH_NOT_FOUND', 'Mock match expired — search the player again.');
  }

  const index = parseInt(m[2], 10);
  const core = generateCore(identity.seedBase, index);
  const rng = mulberry32(core.mseed ^ 0xbeef);
  const { baseElo } = computeWalk(identity.seedBase);

  // Build both teams: the searched player + 9 seeded bots, unique agents per team.
  const enemyTeam = core.playerTeam === 'Red' ? 'Blue' : 'Red';
  const names = shuffled(rng, BOT_NAMES);
  const otherAgents = shuffled(rng, AGENTS.filter((a) => a !== core.agent));

  const playerEntry = {
    puuid: `mock-puuid-${m[1]}`,
    name: identity.name,
    tag: identity.tag,
    team: core.playerTeam,
    agent: { name: core.agent, iconUrl: null },
    tier: tierForElo(baseElo + irange(rng, -60, 60)),
    stats: scoreboardStats(core.raw, core.roundsPlayed),
  };

  const bots = Array.from({ length: 9 }, (_, i) => {
    const team = i < 4 ? core.playerTeam : enemyTeam;
    const onWinningSide = (team === core.playerTeam) === core.win;
    const kills = Math.max(2, Math.round(core.roundsPlayed * range(rng, 0.45, 0.95) * (onWinningSide ? 1.08 : 0.92)));
    const deaths = Math.max(2, Math.round(core.roundsPlayed * range(rng, 0.5, 0.9)));
    const assists = irange(rng, 1, 10);
    const acsVal = Math.round((kills / core.roundsPlayed) * 165 + range(rng, 30, 80));
    return {
      puuid: `mock-bot-${core.mseed}-${i}`,
      name: names[i],
      tag: pick(rng, BOT_TAGS),
      team,
      agent: { name: otherAgents[i], iconUrl: null },
      tier: tierForElo(baseElo + irange(rng, -220, 220)),
      stats: scoreboardStats(
        {
          kills, deaths, assists,
          combatScore: acsVal * core.roundsPlayed,
          totalDamage: Math.round(acsVal * range(rng, 0.58, 0.68) * core.roundsPlayed),
          headshots: Math.round(kills * 4 * range(rng, 0.1, 0.35)),
          bodyshots: Math.round(kills * 4 * 0.6),
          legshots: irange(rng, 0, 5),
        },
        core.roundsPlayed
      ),
    };
  });

  const redWon = core.win === (core.playerTeam === 'Red');
  return {
    matchId,
    map: core.map,
    mode: 'Competitive',
    queue: 'competitive',
    startedAt: core.startedAt,
    lengthMs: core.lengthMs,
    roundsPlayed: core.roundsPlayed,
    teams: {
      red: { roundsWon: core.playerTeam === 'Red' ? core.roundsWon : core.roundsLost, won: redWon },
      blue: { roundsWon: core.playerTeam === 'Blue' ? core.roundsWon : core.roundsLost, won: !redWon },
    },
    players: [playerEntry, ...bots],
  };
}

function scoreboardStats(raw, roundsPlayed) {
  const hits = raw.headshots + raw.bodyshots + raw.legshots;
  return {
    kills: raw.kills,
    deaths: raw.deaths,
    assists: raw.assists,
    combatScore: raw.combatScore,
    acs: Math.round(raw.combatScore / roundsPlayed),
    adr: Math.round(raw.totalDamage / roundsPlayed),
    hsPercent: hits > 0 ? Math.round((raw.headshots / hits) * 1000) / 1000 : null,
  };
}

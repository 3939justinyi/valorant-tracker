// DTOs returned by the Express proxy — kept in lockstep with the server's
// adapter normalizers (server/utils/*Adapter.js).

export type Region = 'na' | 'eu' | 'ap' | 'kr' | 'br' | 'latam';

export interface PlayerQuery {
  region: Region;
  name: string;
  tag: string;
}

export interface Account {
  puuid: string | null;
  name: string;
  tag: string;
  region: string | null;
  accountLevel: number | null;
  card: { small: string | null; wide: string | null };
}

export interface TierInfo {
  id: number | null;
  name: string | null;
}

export interface MMR {
  name: string;
  tag: string;
  region: string;
  unavailable?: boolean;
  reason?: string;
  current: { tier: TierInfo; rr: number | null; lastChange: number | null; elo: number | null };
  peak: { tier: TierInfo; season: string | null };
  act: { wins: number | null; losses: number | null; games: number | null; winRate: number | null };
}

export interface MatchStats {
  kills: number;
  deaths: number;
  assists: number;
  combatScore: number;
  acs: number;
  kd: number;
  kda: number;
  totalDamage: number;
  adr: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  hsPercent: number | null;
  firstBloods: number | null;
  kastRounds: number | null;
  kastPercent: number | null;
  clutchesWon: number | null;
  clutchesAttempted: number | null;
}

export interface MatchSummary {
  matchId: string;
  region: string;
  queue: string;
  mode: string;
  map: string;
  startedAt: string;
  lengthMs: number | null;
  result: 'win' | 'loss' | 'draw';
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  score: string;
  agent: { name: string; iconUrl: string | null };
  tier: TierInfo;
  rr: { change: number | null; after: number | null; eloAfter: number | null };
  stats: MatchStats;
}

export interface AgentAggregate {
  name: string;
  iconUrl: string | null;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  acs: number;
  kda: number;
}

export interface MapAggregate {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  acs: number;
  kda: number;
}

export interface ProgressionPoint {
  matchId: string;
  date: string;
  result: string;
  rrChange: number | null;
  rrAfter: number | null;
  eloAfter: number | null;
  tierName: string | null;
}

export interface Aggregates {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
  kills: number;
  deaths: number;
  assists: number;
  kda: number | null;
  kd: number | null;
  acs: number | null;
  adr: number | null;
  hsPercent: number | null;
  kastPercent: number | null;
  firstBloods: number | null;
  firstBloodsPerMatch: number | null;
  clutchesWon: number;
  clutchesAttempted: number;
  agents: AgentAggregate[];
  maps: MapAggregate[];
  progression: ProgressionPoint[];
}

export interface MatchesResponse {
  matches: MatchSummary[];
  aggregates: Aggregates;
}

export interface ScoreboardPlayer {
  puuid: string;
  name: string;
  tag: string;
  team: string;
  agent: { name: string; iconUrl: string | null };
  tier: TierInfo;
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    combatScore: number;
    acs: number;
    adr: number;
    hsPercent: number | null;
  };
}

export interface MatchDetail {
  matchId: string;
  map: string;
  mode: string;
  queue: string;
  startedAt: string;
  lengthMs: number | null;
  roundsPlayed: number;
  teams: {
    red: { roundsWon: number; won: boolean };
    blue: { roundsWon: number; won: boolean };
  };
  players: ScoreboardPlayer[];
}

export interface ContentAgent {
  uuid: string;
  name: string;
  icon: string | null;
  role: string | null;
  roleIcon: string | null;
}

export interface ContentMap {
  name: string;
  mapUrl: string;
  icon: string | null;
  splash: string | null;
}

export interface ContentTier {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ContentResponse {
  agents: ContentAgent[];
  maps: ContentMap[];
  tiers: ContentTier[];
}

export interface Health {
  status: string;
  dataSource: 'mock' | 'henrik' | 'riot';
  uptime: number;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kdaRatio,
  kdRatio,
  hsPercent,
  adr,
  winRate,
  deriveRoundStats,
  aggregateMatches,
  buildMatchStats,
} from '../utils/statCalculator.js';
import { tierForElo, eloToRR } from '../utils/tiers.js';

test('basic ratios guard against divide-by-zero', () => {
  assert.equal(kdaRatio(10, 0, 5), 15); // zero deaths → divide by 1
  assert.equal(kdRatio(7, 0), 7);
  assert.equal(hsPercent(0, 0, 0), null);
  assert.equal(adr(0, 0), 0);
  assert.equal(winRate(0, 0), null);
});

test('hsPercent uses all hit locations', () => {
  assert.equal(hsPercent(25, 60, 15), 0.25);
});

test('tier math maps elo to the right division', () => {
  assert.deepEqual(tierForElo(0), { id: 3, name: 'Iron 1' });
  assert.deepEqual(tierForElo(1550), { id: 18, name: 'Diamond 1' });
  assert.deepEqual(tierForElo(2405), { id: 27, name: 'Radiant' });
  assert.equal(eloToRR(1550), 50);
  assert.equal(eloToRR(2455), 55); // Radiant RR is open-ended
});

function killEvent(killer, victim, timeMs, assistants = []) {
  return { killer, victim, timeMs, assistants };
}

const me = 'P1';
const teammates = ['P1', 'P2', 'P3', 'P4', 'P5'];
const enemies = ['E1', 'E2', 'E3', 'E4', 'E5'];
const ctx = { puuid: me, playerTeam: 'Red', teammates, enemies };

test('deriveRoundStats: first blood, KAST and clutch detection', () => {
  const rounds = [
    // R1: I get the opening kill and survive → FB + KAST
    { winningTeam: 'Red', kills: [killEvent(me, 'E1', 5000), killEvent('P2', 'E2', 9000)] },
    // R2: I die untraded with no kill/assist → not a KAST round
    { winningTeam: 'Blue', kills: [killEvent('E1', me, 4000), killEvent('E1', 'P2', 9000), killEvent('E1', 'P3', 9500), killEvent('E2', 'P4', 9800), killEvent('E3', 'P5', 9900)] },
    // R3: I die but my killer is traded within 5s → KAST
    { winningTeam: 'Blue', kills: [killEvent('E2', me, 10000), killEvent('P3', 'E2', 12000)] },
    // R4: whole team dies except me, 2 enemies alive → clutch attempt, team wins → clutch won
    {
      winningTeam: 'Red',
      kills: [
        killEvent('E1', 'P2', 3000),
        killEvent('E2', 'P3', 4000),
        killEvent('E3', 'P4', 5000),
        killEvent('P5', 'E1', 5500),
        killEvent('E2', 'P5', 6000), // now I'm last alive vs E2..E5
        killEvent(me, 'E2', 7000),
        killEvent(me, 'E3', 8000),
        killEvent(me, 'E4', 9000),
        killEvent(me, 'E5', 10000),
      ],
    },
  ];

  const s = deriveRoundStats(rounds, ctx);
  assert.equal(s.firstBloods, 1);
  assert.equal(s.firstDeaths, 2); // R2 and R3: player is the round's first victim
  assert.equal(s.kastRounds, 3); // R1, R3, R4
  assert.equal(s.kastPercent, 0.75);
  assert.equal(s.clutchesAttempted, 1);
  assert.equal(s.clutchesWon, 1);
});

test('deriveRoundStats returns nulls without round data', () => {
  const s = deriveRoundStats([], ctx);
  assert.equal(s.firstBloods, null);
  assert.equal(s.kastPercent, null);
});

function fakeMatch(overrides = {}) {
  const raw = {
    kills: 20, deaths: 10, assists: 5, combatScore: 5000, totalDamage: 3000,
    headshots: 20, bodyshots: 70, legshots: 10, roundsPlayed: 20,
    firstBloods: 2, firstDeaths: 1, kastRounds: 15, kastPercent: 0.75, clutchesWon: 1, clutchesAttempted: 2,
  };
  return {
    matchId: overrides.matchId ?? 'm1',
    startedAt: overrides.startedAt ?? '2026-06-01T00:00:00.000Z',
    result: overrides.result ?? 'win',
    roundsPlayed: 20,
    map: overrides.map ?? 'Ascent',
    agent: { name: overrides.agent ?? 'Jett', iconUrl: null },
    tier: { id: 18, name: 'Diamond 1' },
    rr: overrides.rr ?? { change: 18, after: 50, eloAfter: 1550 },
    stats: buildMatchStats(raw),
    ...overrides.extra,
  };
}

test('aggregateMatches computes round-weighted aggregates and groupings', () => {
  const matches = [
    fakeMatch(),
    fakeMatch({ matchId: 'm2', result: 'loss', map: 'Bind', agent: 'Jett', startedAt: '2026-06-02T00:00:00.000Z', rr: { change: -15, after: 35, eloAfter: 1535 } }),
    fakeMatch({ matchId: 'm3', result: 'win', map: 'Ascent', agent: 'Omen', startedAt: '2026-06-03T00:00:00.000Z', rr: { change: 20, after: 55, eloAfter: 1555 } }),
  ];
  const agg = aggregateMatches(matches);

  assert.equal(agg.matches, 3);
  assert.equal(agg.wins, 2);
  assert.equal(agg.losses, 1);
  assert.equal(agg.winRate, 0.667);
  assert.equal(agg.kills, 60);
  assert.equal(agg.acs, 250); // 15000 score / 60 rounds
  assert.equal(agg.adr, 150);
  assert.equal(agg.hsPercent, 0.2);
  assert.equal(agg.kastPercent, 0.75);
  assert.equal(agg.firstBloodsPerMatch, 2);
  assert.equal(agg.firstDeaths, 3); // 1 FD × 3 matches
  assert.equal(agg.entryRate, 0.15); // (6 FK + 3 FD) / 60 rounds
  assert.equal(agg.entrySuccess, 0.667); // 6 FK / 9 opening duels
  assert.equal(agg.clutchesWon, 3);
  assert.equal(agg.clutchesAttempted, 6);

  const jett = agg.agents.find((a) => a.name === 'Jett');
  assert.equal(jett.matches, 2);
  assert.equal(jett.wins, 1);
  assert.equal(jett.winRate, 0.5);

  const ascent = agg.maps.find((m) => m.name === 'Ascent');
  assert.equal(ascent.matches, 2);
  assert.equal(ascent.winRate, 1);

  // progression is oldest → newest for charting
  assert.deepEqual(agg.progression.map((p) => p.matchId), ['m1', 'm2', 'm3']);
  assert.equal(agg.progression[0].eloAfter, 1550);
});

test('aggregateMatches handles an empty history', () => {
  const agg = aggregateMatches([]);
  assert.equal(agg.matches, 0);
  assert.equal(agg.winRate, null);
  assert.deepEqual(agg.agents, []);
});

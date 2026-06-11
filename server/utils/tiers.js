// Competitive tier table (post-Ascendant ladder). Tier ids match Riot/Henrik
// numeric tiers: 0-2 unranked/unused, 3 = Iron 1 ... 27 = Radiant.
const BASE_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];

export const TIERS = [
  ...BASE_NAMES.flatMap((base, i) =>
    [1, 2, 3].map((div) => ({ id: 3 + i * 3 + (div - 1), name: `${base} ${div}` }))
  ),
  { id: 27, name: 'Radiant' },
];

const BY_ID = new Map(TIERS.map((t) => [t.id, t.name]));

export function tierNameById(id) {
  return BY_ID.get(id) ?? null;
}

// "elo" is the absolute ladder value: (tierId - 3) * 100 + RR.
// Radiant RR is open-ended above 2400.
export function tierForElo(elo) {
  const e = Math.max(0, Math.round(elo));
  const id = Math.min(27, 3 + Math.floor(e / 100));
  return { id, name: tierNameById(id) };
}

export function eloToRR(elo) {
  const e = Math.max(0, Math.round(elo));
  return e >= 2400 ? e - 2400 : e % 100;
}

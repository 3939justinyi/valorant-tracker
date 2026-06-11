import type { PlayerQuery, Region } from '../types';

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'na', label: 'NA' },
  { value: 'eu', label: 'EU' },
  { value: 'ap', label: 'AP' },
  { value: 'kr', label: 'KR' },
  { value: 'br', label: 'BR' },
  { value: 'latam', label: 'LATAM' },
];

export const MATCH_COUNT_OPTIONS = [5, 10, 20];

/** Fallback tier colors (the content API supplies exact ones when online). */
export const TIER_COLORS: Record<string, string> = {
  Iron: '#7C8083',
  Bronze: '#B08B59',
  Silver: '#C9D5D9',
  Gold: '#ECCE57',
  Platinum: '#41B2A6',
  Diamond: '#C688F0',
  Ascendant: '#3FB585',
  Immortal: '#E05C6E',
  Radiant: '#FFF3B0',
};

export function tierColor(tierName: string | null | undefined): string {
  if (!tierName) return '#8FA3B0';
  const base = tierName.split(' ')[0];
  return TIER_COLORS[base] ?? '#8FA3B0';
}

export const ROLE_COLORS: Record<string, string> = {
  Duelist: '#FF4655',
  Initiator: '#F0B254',
  Controller: '#9A7BFF',
  Sentinel: '#0FD8B4',
};

/** One-click demo searches shown on the empty state. */
export const SAMPLE_PLAYERS: PlayerQuery[] = [
  { region: 'na', name: 'TenZ', tag: '000' },
  { region: 'eu', name: 'Boaster', tag: 'fan' },
  { region: 'kr', name: 'StellarNova', tag: 'KR1' },
];

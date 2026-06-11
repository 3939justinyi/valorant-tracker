export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString();
}

/** 0–1 ratio → "63%" (or "63.4%" with digits=1). */
export function fmtPct(x: number | null | undefined, digits = 0): string {
  if (x == null || Number.isNaN(x)) return '—';
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtSigned(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n > 0 ? `+${n}` : `${n}`;
}

export function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  const weeks = days / 7;
  if (weeks < 5) return `${Math.floor(weeks)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "e9a2" → "EP 9 // ACT 2" */
export function fmtSeason(season: string | null | undefined): string {
  if (!season) return '';
  const m = /^e(\d+)a(\d+)$/i.exec(season);
  return m ? `EP ${m[1]} // ACT ${m[2]}` : season.toUpperCase();
}

/** Parse "Name#Tag" → { name, tag } (splits on the LAST '#'). */
export function parseRiotId(input: string): { name: string; tag: string } | null {
  const trimmed = input.trim();
  const idx = trimmed.lastIndexOf('#');
  if (idx <= 0 || idx === trimmed.length - 1) return null;
  const name = trimmed.slice(0, idx).trim();
  const tag = trimmed.slice(idx + 1).trim();
  if (!name || !tag || tag.length > 8) return null;
  return { name, tag };
}

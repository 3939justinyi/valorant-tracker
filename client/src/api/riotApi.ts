import type {
  Account,
  ContentResponse,
  Health,
  MatchDetail,
  MatchesResponse,
  MMR,
} from '../types';

// All requests go to OUR Express proxy — the Riot/Henrik API key never
// reaches the browser. In dev, Vite proxies /api → localhost:3001; in a split
// deployment set VITE_API_BASE_URL to the backend origin.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the stats server — is the backend running?');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

const enc = encodeURIComponent;

export const fetchHealth = () => get<Health>('/api/health');

export const fetchAccount = (name: string, tag: string) =>
  get<Account>(`/api/account/${enc(name)}/${enc(tag)}`);

export const fetchMMR = (region: string, name: string, tag: string) =>
  get<MMR>(`/api/mmr/${region}/${enc(name)}/${enc(tag)}`);

export const fetchMatches = (region: string, name: string, tag: string, size: number) =>
  get<MatchesResponse>(`/api/matches/${region}/${enc(name)}/${enc(tag)}?size=${size}&queue=competitive`);

export const fetchMatchDetail = (region: string, matchId: string) =>
  get<MatchDetail>(`/api/match/${region}/${enc(matchId)}`);

export const fetchContent = () => get<ContentResponse>('/api/content');

/** Retry transient failures only — a 404 (player not found) or 429 won't fix itself. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  return true;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

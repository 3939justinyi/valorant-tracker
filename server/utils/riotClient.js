import axios from 'axios';
import { ApiError } from './errors.js';

const TIMEOUT = 10_000;

// ── HenrikDev (unofficial) ───────────────────────────────────────────────────
const henrik = axios.create({
  baseURL: 'https://api.henrikdev.xyz',
  timeout: TIMEOUT,
  headers: process.env.HENRIK_API_KEY ? { Authorization: process.env.HENRIK_API_KEY } : {},
});

export async function henrikGet(path, params = {}) {
  try {
    const res = await henrik.get(path, { params });
    return res.data;
  } catch (err) {
    throw mapUpstreamError(err, 'HenrikDev');
  }
}

// ── Official Riot API ────────────────────────────────────────────────────────
// Account-V1 lives on continental routes; VAL endpoints live on game shards.
export const ACCOUNT_ROUTE = 'americas'; // account lookups work from any continental route
const SHARD_BY_REGION = { na: 'na', eu: 'eu', ap: 'ap', kr: 'kr', br: 'br', latam: 'latam' };

export function shardFor(region) {
  return SHARD_BY_REGION[region] ?? 'na';
}

export async function riotGet(host, path, params = {}) {
  if (!process.env.RIOT_API_KEY) {
    throw new ApiError(503, 'NO_API_KEY', 'RIOT_API_KEY is not configured on the server.');
  }
  try {
    const res = await axios.get(`https://${host}.api.riotgames.com${path}`, {
      params,
      timeout: TIMEOUT,
      headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
    });
    return res.data;
  } catch (err) {
    throw mapUpstreamError(err, 'Riot API');
  }
}

// ── Shared upstream → ApiError mapping ───────────────────────────────────────
function mapUpstreamError(err, providerName) {
  if (err instanceof ApiError) return err;
  const status = err.response?.status;
  const upstreamMsg =
    err.response?.data?.errors?.[0]?.message ?? // henrik error envelope
    err.response?.data?.status?.message ?? // riot error envelope
    null;

  switch (status) {
    case 400:
      return new ApiError(400, 'BAD_REQUEST', upstreamMsg ?? `Invalid request to ${providerName}.`);
    case 401:
    case 403:
      return new ApiError(
        502,
        'API_KEY_INVALID',
        `${providerName} rejected the API key (expired or missing). Check the server .env.`
      );
    case 404:
      return new ApiError(404, 'NOT_FOUND', 'No player found with that Riot ID in this region.');
    case 429:
      return new ApiError(429, 'RATE_LIMITED', `${providerName} rate limit hit — wait a moment and retry.`);
    default:
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        return new ApiError(504, 'UPSTREAM_TIMEOUT', `${providerName} timed out.`);
      }
      return new ApiError(502, 'UPSTREAM_ERROR', `${providerName} request failed${status ? ` (${status})` : ''}.`);
  }
}

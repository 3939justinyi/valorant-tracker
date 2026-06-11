export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = status < 500;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const REGIONS = ['na', 'eu', 'ap', 'kr', 'br', 'latam'];

export function validateRegion(region) {
  const r = String(region || '').toLowerCase();
  if (!REGIONS.includes(r)) {
    throw new ApiError(400, 'INVALID_REGION', `Unknown region "${region}". Use one of: ${REGIONS.join(', ')}.`);
  }
  return r;
}

export function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

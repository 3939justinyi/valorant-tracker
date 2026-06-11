import { rateLimit } from 'express-rate-limit';

// Protects the proxy (and your upstream API quota) from hammering.
export const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down and retry in a minute.' },
    }),
});

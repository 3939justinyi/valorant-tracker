import { Router } from 'express';
import { cached } from '../middleware/cache.js';
import { asyncHandler, validateRegion, clampInt } from '../utils/errors.js';
import { source } from '../utils/dataSource.js';
import { aggregateMatches } from '../utils/statCalculator.js';

const router = Router();

// Match history + server-side aggregates (performance panel, per-agent,
// per-map, RR progression). ?size=5|10|20  ?queue=competitive|unrated|all
router.get(
  '/matches/:region/:name/:tag',
  cached(60),
  asyncHandler(async (req, res) => {
    const region = validateRegion(req.params.region);
    const { name, tag } = req.params;
    const size = clampInt(req.query.size, 20, 1, 20);
    const queue = String(req.query.queue ?? 'competitive').toLowerCase();

    const matches = await source.getMatches({ region, name, tag, size, queue });
    res.json({ matches, aggregates: aggregateMatches(matches) });
  })
);

export default router;

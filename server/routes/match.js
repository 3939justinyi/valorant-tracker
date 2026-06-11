import { Router } from 'express';
import { cached } from '../middleware/cache.js';
import { asyncHandler, validateRegion } from '../utils/errors.js';
import { source } from '../utils/dataSource.js';

const router = Router();

// Full match scoreboard (fetched lazily when a history card is expanded).
// Finished matches never change, so cache for an hour.
router.get(
  '/match/:region/:matchId',
  cached(3600),
  asyncHandler(async (req, res) => {
    const region = validateRegion(req.params.region);
    const { matchId } = req.params;
    res.json(await source.getMatchDetail({ region, matchId }));
  })
);

export default router;

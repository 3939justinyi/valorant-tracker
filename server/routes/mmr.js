import { Router } from 'express';
import { cached } from '../middleware/cache.js';
import { asyncHandler, validateRegion } from '../utils/errors.js';
import { source } from '../utils/dataSource.js';

const router = Router();

// Current rank, RR, last change, act win/loss, peak rank
router.get(
  '/mmr/:region/:name/:tag',
  cached(60),
  asyncHandler(async (req, res) => {
    const region = validateRegion(req.params.region);
    const { name, tag } = req.params;
    res.json(await source.getMMR({ region, name, tag }));
  })
);

export default router;

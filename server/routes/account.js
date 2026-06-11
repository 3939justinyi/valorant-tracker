import { Router } from 'express';
import { cached } from '../middleware/cache.js';
import { asyncHandler } from '../utils/errors.js';
import { source } from '../utils/dataSource.js';

const router = Router();

// Riot ID → account (PUUID, level, card)
router.get(
  '/account/:name/:tag',
  cached(120),
  asyncHandler(async (req, res) => {
    const { name, tag } = req.params;
    res.json(await source.getAccount({ name, tag }));
  })
);

export default router;

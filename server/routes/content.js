import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { getContent } from '../utils/contentProvider.js';

const router = Router();

// Static game content (agent portraits/roles, map art, rank tier icons)
// from valorant-api.com. No route-level cache here: the provider caches
// success for 24h but a failed fetch for only 60s, and a response cache
// would pin that empty fallback long past the retry window.
router.get(
  '/content',
  asyncHandler(async (req, res) => {
    res.json(await getContent());
  })
);

export default router;

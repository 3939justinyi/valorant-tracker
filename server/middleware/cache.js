import NodeCache from 'node-cache';

// In-process response cache. Riot dev keys allow 20 req/s and 100 req/2min,
// so every successful JSON response is cached (keyed by URL) and identical
// requests inside the TTL never touch the upstream API.
const store = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

export function cached(ttlSeconds = 60) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const hit = store.get(key);
    if (hit) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(hit);
    }
    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) store.set(key, body, ttlSeconds);
      return originalJson(body);
    };
    next();
  };
}

export function cacheStats() {
  return store.getStats();
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { limiter } from './middleware/rateLimiter.js';
import accountRouter from './routes/account.js';
import mmrRouter from './routes/mmr.js';
import matchesRouter from './routes/matches.js';
import matchRouter from './routes/match.js';
import contentRouter from './routes/content.js';
import { dataSource } from './utils/dataSource.js';
import { getContent } from './utils/contentProvider.js';

const app = express();
app.disable('x-powered-by');
// Behind a hosted proxy (Render/Railway) the client IP arrives in
// X-Forwarded-For; without this, express-rate-limit refuses to start.
app.set('trust proxy', 1);

const corsOrigin = process.env.CORS_ORIGIN ?? '*';
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }));
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', dataSource, uptime: Math.round(process.uptime()) })
);

app.use('/api', limiter);
app.use('/api', accountRouter);
app.use('/api', mmrRouter);
app.use('/api', matchesRouter);
app.use('/api', matchRouter);
app.use('/api', contentRouter);

app.use((req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } })
);

// Central error handler — ApiError instances surface their message/code,
// anything unexpected is logged and masked.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(`[valtracker] ${req.method} ${req.originalUrl} →`, err);
  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.expose ? err.message : 'Internal server error.',
    },
  });
});

// Warm the static-content cache (agents/maps/tiers) so the first page load
// doesn't pay the valorant-api.com round trip.
getContent()
  .then((c) => console.log(`[valtracker] content cache warmed (${c.agents.length} agents, ${c.maps.length} maps)`))
  .catch(() => {});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`[valtracker] API listening on :${port} (data source: ${dataSource})`);
  if (dataSource === 'mock') {
    console.log('[valtracker] No API key configured — serving deterministic demo data.');
    console.log('[valtracker] Set HENRIK_API_KEY or RIOT_API_KEY in server/.env for live data.');
  }
});

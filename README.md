# VAL//TRACKER

A full-stack Valorant player stats & ranking app: look up any player's rank, RR,
match history, and in-game performance. Dark, cinematic, tactical — native to the
Valorant aesthetic.

![stack](https://img.shields.io/badge/React%2018-TypeScript-blue) ![api](https://img.shields.io/badge/Express-proxy-red) ![style](https://img.shields.io/badge/Tailwind-0F1923-ff4655)

## Features

- **Player search** — Riot ID (`Name#Tag`) + region selector, with friendly errors
  (not found / bad format / rate limited)
- **Rank & MMR card** — tier + division, official rank icon, RR progress bar, last
  RR change, act W/L + win rate, peak rank
- **Performance panel** — K/D/A totals, KDA & K/D ratios, ACS, HS%, ADR, first
  bloods/match, clutches won/attempted, KAST% over the last 5/10/20 matches
- **Agent breakdown** — top 5 agents with portraits + role tags, sortable by
  matches / win % / ACS / KDA
- **Map performance** — win rate per map as a horizontal bar chart (ACS + record
  in the tooltip)
- **Match history feed** — W/L badge, map thumbnail, agent, K/D/A, ACS, duration,
  relative time, RR delta; click any row for the **full 10-player scoreboard**
  sorted by ACS (fetched lazily)
- **Rank progression chart** — RR/elo over the last ~20 matches with tier-boundary
  reference lines and result tooltips
- **Comparison mode** — two players side by side with winner indicators per stat

## Architecture

```
valorant-tracker/
├── server/                  Express proxy (the API key NEVER reaches the browser)
│   ├── index.js             app entry — CORS, health, error handler, content warm-up
│   ├── routes/              account · mmr · matches · match · content
│   ├── middleware/          rateLimiter (express-rate-limit) · cache (node-cache, 60s+)
│   └── utils/
│       ├── riotClient.js    axios clients + upstream error mapping
│       ├── statCalculator.js pure stat math: ACS/KDA/HS%/ADR/KAST/clutches + aggregation
│       ├── henrikAdapter.js  HenrikDev API → normalized DTOs (prototyping)
│       ├── riotAdapter.js    official Riot API → normalized DTOs (production)
│       ├── mockAdapter.js    deterministic seeded demo data (no keys needed)
│       └── contentProvider.js agents/maps/tier icons from valorant-api.com (24h cache)
└── client/                  Vite + React 18 + TypeScript + Tailwind
    └── src/
        ├── api/riotApi.ts   typed fetchers → the proxy only
        ├── hooks/           usePlayer · useMMR · useMatches · useContent (React Query)
        ├── components/      SearchBar · PlayerCard · StatsPanel · AgentBreakdown ·
        │                    MapPerformance · MatchHistoryFeed · MatchDetailModal ·
        │                    RankProgressChart · ComparisonView · skeletons · ErrorBoundary
        └── utils/           formatters · constants (tier/role colors, regions)
```

The server normalizes every upstream payload into one DTO shape and pre-computes
all aggregates (`aggregateMatches`), so the frontend never does heavy math. Round
events (kill timelines) are reduced to first bloods, KAST%, and clutch attempts in
`statCalculator.deriveRoundStats` — shared by the Henrik and Riot adapters and
covered by unit tests.

## Quick start

Requires Node ≥ 18.17.

```bash
npm install        # installs both workspaces
npm run dev        # API on :3001 + client on :5173 (concurrently)
```

Open http://localhost:5173 — **it works immediately with zero API keys** using the
deterministic mock data source (a "DEMO DATA" badge shows in the header; the same
Riot ID always generates the same profile).

```bash
npm test           # server unit tests (stat math, KAST/clutch derivation, tiers)
npm run build      # type-check + production build of the client
```

## Going live

Create `server/.env` (see `server/.env.example`):

| Variable | Effect |
| --- | --- |
| `HENRIK_API_KEY` | Use the [HenrikDev API](https://docs.henrikdev.xyz) — full MMR + match data, free key via their Discord. Best for prototyping. |
| `RIOT_API_KEY` | Use the official [Riot API](https://developer.riotgames.com). Dev keys expire **every 24h**; VAL match endpoints need an approved product for production. No per-player MMR endpoint exists, so the rank card degrades gracefully. |
| `DATA_SOURCE` | Force `mock` / `henrik` / `riot` (default `auto`: henrik → riot → mock). |

API surface (all JSON, all cached, all rate-limited):

```
GET /api/health
GET /api/account/:name/:tag
GET /api/mmr/:region/:name/:tag
GET /api/matches/:region/:name/:tag?size=20&queue=competitive   → { matches, aggregates }
GET /api/match/:region/:matchId                                  → full scoreboard
GET /api/content                                                 → agents/maps/tier assets
```

Regions: `na eu ap kr br latam`.

## Deployment

- **Client → Vercel**: project root `client/`, build `npm run build`, output `dist/`.
  Set `VITE_API_BASE_URL=https://<your-backend>` .
- **Server → Railway/Render**: root `server/`, start `node index.js`. Set the API
  key env vars and `CORS_ORIGIN=https://<your-frontend>`.

## Gotchas baked into the design

1. Dev Riot keys die every 24h — expired/invalid keys surface as a clear
   `API_KEY_INVALID` error, and mock mode keeps the app demoable regardless.
2. Riot rate limits are tight (20 req/s, 100 req/2min) — every response is cached
   (matches 60s, finished match details 1h, static content 24h) and match details
   are only fetched when a row is expanded.
3. PUUIDs are region-agnostic but MMR/match endpoints aren't — region lives in the
   URL and the search bar.
4. Act IDs / static content are fetched and cached at server start
   (`contentProvider`), with a names-only fallback if the CDN is unreachable
   (the UI renders letter avatars).
5. HenrikDev is great for prototyping but unofficial — the adapter seam
   (`utils/dataSource.js`) makes the migration to the official API a one-line env
   change, not a rewrite.

## Roadmap (stretch)

- [ ] Riot SSO login ("my stats" without searching)
- [ ] Live game tracker with teammate ranks
- [ ] Season-over-season history
- [ ] Bookmarked players (localStorage)
- [ ] Playstyle badges ("Entry Fragger", "Anchor")
- [ ] Regional leaderboard page

---

*VALTRACKER isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties.*

import { useCallback, useState } from 'react';
import SearchBar from './components/SearchBar';
import PlayerCard from './components/PlayerCard';
import StatsPanel from './components/StatsPanel';
import AgentBreakdown from './components/AgentBreakdown';
import MapPerformance from './components/MapPerformance';
import MatchHistoryFeed from './components/MatchHistoryFeed';
import MatchDetailModal from './components/MatchDetailModal';
import RankProgressChart from './components/RankProgressChart';
import ComparisonView from './components/ComparisonView';
import {
  ChartSkeleton,
  FeedSkeleton,
  PlayerCardSkeleton,
  StatsPanelSkeleton,
  TableSkeleton,
} from './components/LoadingSkeleton';
import { usePlayer, useHealth } from './hooks/usePlayer';
import { useMMR } from './hooks/useMMR';
import { useMatches } from './hooks/useMatches';
import { ApiError, errorMessage } from './api/riotApi';
import { SAMPLE_PLAYERS } from './utils/constants';
import type { PlayerQuery, Region } from './types';

type Tab = 'profile' | 'compare';

// Shareable URLs: /?region=na&name=TenZ&tag=000
function queryFromUrl(): PlayerQuery | null {
  const p = new URLSearchParams(window.location.search);
  const name = p.get('name');
  const tag = p.get('tag');
  if (!name || !tag) return null;
  return { region: (p.get('region') ?? 'na') as Region, name, tag };
}

function queryToUrl(q: PlayerQuery | null) {
  const url = q
    ? `?region=${q.region}&name=${encodeURIComponent(q.name)}&tag=${encodeURIComponent(q.tag)}`
    : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('profile');
  const [query, setQuery] = useState<PlayerQuery | null>(queryFromUrl);
  const health = useHealth();

  const search = useCallback((q: PlayerQuery) => {
    setQuery(q);
    queryToUrl(q);
    setTab('profile');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-val-border bg-val-bg/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => {
              setQuery(null);
              queryToUrl(null);
              setTab('profile');
            }}
            className="text-xl font-bold tracking-widest uppercase"
          >
            VAL<span className="text-val-red">//</span>TRACKER
          </button>

          {health.data?.dataSource === 'mock' && (
            <span
              title="No API key configured on the server — showing deterministic demo data."
              className="text-[10px] font-bold uppercase tracking-widest text-val-gold border border-val-gold/50 px-2 py-0.5"
            >
              Demo data
            </span>
          )}

          <nav className="flex gap-1 ml-auto">
            {(['profile', 'compare'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-bold uppercase tracking-widest border transition-colors ${
                  tab === t
                    ? 'bg-val-red border-val-red text-white'
                    : 'border-transparent text-val-muted hover:text-val-cream'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-20">
        {tab === 'compare' ? (
          <div className="pt-6">
            <ComparisonView />
          </div>
        ) : query ? (
          <Profile query={query} onSearch={search} />
        ) : (
          <Hero onSearch={search} />
        )}
      </main>

      <footer className="border-t border-val-border py-4">
        <p className="max-w-6xl mx-auto px-4 text-xs text-val-muted">
          VALTRACKER isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot
          Games or anyone officially involved in producing or managing Riot Games properties.
        </p>
      </footer>
    </div>
  );
}

function Hero({ onSearch }: { onSearch: (q: PlayerQuery) => void }) {
  return (
    <div className="flex flex-col items-center justify-center pt-24 sm:pt-32 text-center">
      <div className="text-val-red text-sm font-bold uppercase tracking-[0.4em] mb-3">
        // Stats · Rank · Match History
      </div>
      <h1 className="text-4xl sm:text-6xl font-bold uppercase tracking-wider mb-8">
        Track your game
      </h1>
      <div className="w-full max-w-xl">
        <SearchBar onSearch={onSearch} autoFocus />
      </div>
      <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
        <span className="text-xs uppercase tracking-widest text-val-muted">Try:</span>
        {SAMPLE_PLAYERS.map((p) => (
          <button
            key={`${p.name}#${p.tag}`}
            onClick={() => onSearch(p)}
            className="text-sm border border-val-border hover:border-val-red px-3 py-1 text-val-muted hover:text-val-cream transition-colors"
          >
            {p.name}#{p.tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function Profile({ query, onSearch }: { query: PlayerQuery; onSearch: (q: PlayerQuery) => void }) {
  const [size, setSize] = useState(20);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const account = usePlayer(query);
  const mmr = useMMR(query);
  const matches = useMatches(query, size);

  return (
    <div className="space-y-8 pt-6">
      <div className="max-w-xl">
        <SearchBar onSearch={onSearch} size="sm" initialRegion={query.region} />
      </div>

      {/* identity + rank */}
      {account.isPending || mmr.isPending ? (
        <PlayerCardSkeleton />
      ) : account.isError ? (
        <SearchError error={account.error} query={query} />
      ) : account.data ? (
        <PlayerCard account={account.data} mmr={mmr.data} />
      ) : null}

      {/* everything below needs match history */}
      {!account.isError && (
        <>
          {matches.isPending ? (
            <>
              <StatsPanelSkeleton />
              <ChartSkeleton />
              <div className="grid lg:grid-cols-2 gap-6">
                <TableSkeleton />
                <ChartSkeleton height={220} />
              </div>
              <FeedSkeleton />
            </>
          ) : matches.isError ? (
            <div className="panel clip-corner p-5 text-sm">
              <p className="text-val-red font-bold mb-1">Couldn't load match history</p>
              <p className="text-val-muted">{errorMessage(matches.error)}</p>
            </div>
          ) : matches.data ? (
            <>
              <StatsPanel aggregates={matches.data.aggregates} size={size} onSizeChange={setSize} />

              <section>
                <h3 className="section-title mb-3">Rank progression</h3>
                <RankProgressChart progression={matches.data.aggregates.progression} />
              </section>

              <div className="grid lg:grid-cols-2 gap-6 items-start">
                <section>
                  <h3 className="section-title mb-3">Top agents</h3>
                  <AgentBreakdown agents={matches.data.aggregates.agents} />
                </section>
                <section>
                  <h3 className="section-title mb-3">Map performance</h3>
                  <MapPerformance maps={matches.data.aggregates.maps} />
                </section>
              </div>

              <section>
                <h3 className="section-title mb-3">Match history</h3>
                <MatchHistoryFeed matches={matches.data.matches} onSelect={setSelectedMatch} />
              </section>
            </>
          ) : null}
        </>
      )}

      <MatchDetailModal
        region={query.region}
        matchId={selectedMatch}
        highlight={{ name: query.name, tag: query.tag }}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}

function SearchError({ error, query }: { error: unknown; query: PlayerQuery }) {
  const status = error instanceof ApiError ? error.status : null;
  return (
    <div className="panel clip-corner p-6">
      <p className="text-val-red font-bold text-lg mb-1">
        {status === 404 ? `Couldn't find ${query.name}#${query.tag}` : 'Search failed'}
      </p>
      <p className="text-val-muted text-sm">{errorMessage(error)}</p>
      {status === 404 && (
        <ul className="text-val-muted text-sm mt-3 list-disc list-inside space-y-1">
          <li>Check the spelling of the name and tagline</li>
          <li>Try a different region — accounts are looked up per region for rank data</li>
          <li>The player may have changed their Riot ID</li>
        </ul>
      )}
    </div>
  );
}

import { useState } from 'react';
import SearchBar from './SearchBar';
import PlayerCard from './PlayerCard';
import { PlayerCardSkeleton, StatsPanelSkeleton } from './LoadingSkeleton';
import { usePlayer } from '../hooks/usePlayer';
import { useMMR } from '../hooks/useMMR';
import { useMatches } from '../hooks/useMatches';
import { errorMessage } from '../api/riotApi';
import { fmtNum, fmtPct } from '../utils/formatters';
import type { Aggregates, PlayerQuery } from '../types';

const COMPARE_SIZE = 20;

type StatRow = {
  label: string;
  get: (a: Aggregates) => number | null;
  fmt: (v: number | null) => string;
};

const ROWS: StatRow[] = [
  { label: 'Win rate', get: (a) => a.winRate, fmt: (v) => fmtPct(v) },
  { label: 'KDA ratio', get: (a) => a.kda, fmt: (v) => fmtNum(v, 2) },
  { label: 'K/D', get: (a) => a.kd, fmt: (v) => fmtNum(v, 2) },
  { label: 'ACS', get: (a) => a.acs, fmt: (v) => (v == null ? '—' : `${Math.round(v)}`) },
  { label: 'ADR', get: (a) => a.adr, fmt: (v) => (v == null ? '—' : `${Math.round(v)}`) },
  { label: 'HS%', get: (a) => a.hsPercent, fmt: (v) => fmtPct(v, 1) },
  { label: 'KAST', get: (a) => a.kastPercent, fmt: (v) => fmtPct(v) },
  { label: 'First bloods / match', get: (a) => a.firstBloodsPerMatch, fmt: (v) => fmtNum(v, 1) },
];

/** Side-by-side comparison of two players over their last 20 matches. */
export default function ComparisonView() {
  const [left, setLeft] = useState<PlayerQuery | null>(null);
  const [right, setRight] = useState<PlayerQuery | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <ComparePane query={left} onSearch={setLeft} placeholder="Player one — Name#Tag" />
        <ComparePane query={right} onSearch={setRight} placeholder="Player two — Name#Tag" />
      </div>

      {left && right && <DeltaTable left={left} right={right} />}

      {!left && !right && (
        <p className="text-center text-val-muted text-sm uppercase tracking-widest pt-8">
          Search two players to compare head-to-head
        </p>
      )}
    </div>
  );
}

function ComparePane({
  query,
  onSearch,
  placeholder,
}: {
  query: PlayerQuery | null;
  onSearch: (q: PlayerQuery) => void;
  placeholder: string;
}) {
  const account = usePlayer(query);
  const mmr = useMMR(query);

  return (
    <div className="space-y-3">
      <SearchBar onSearch={onSearch} size="sm" placeholder={placeholder} />
      {query && (account.isPending || mmr.isPending) && <PlayerCardSkeleton />}
      {query && account.isError && (
        <div className="panel clip-corner p-4 text-sm text-val-red">{errorMessage(account.error)}</div>
      )}
      {account.data && <PlayerCard account={account.data} mmr={mmr.data} compact />}
    </div>
  );
}

function DeltaTable({ left, right }: { left: PlayerQuery; right: PlayerQuery }) {
  const a = useMatches(left, COMPARE_SIZE);
  const b = useMatches(right, COMPARE_SIZE);

  if (a.isPending || b.isPending) return <StatsPanelSkeleton />;
  if (a.isError || b.isError) {
    return (
      <div className="panel clip-corner p-4 text-sm text-val-red">
        {errorMessage(a.isError ? a.error : b.error)}
      </div>
    );
  }
  if (!a.data || !b.data) return null;

  const aggA = a.data.aggregates;
  const aggB = b.data.aggregates;

  return (
    <section>
      <h3 className="section-title mb-3">Head to head — last {COMPARE_SIZE} matches</h3>
      <div className="panel clip-corner overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-val-muted border-b border-val-border">
              <th className="text-right font-bold px-4 py-3 w-1/3">
                {left.name}
                <span className="text-val-muted/70">#{left.tag}</span>
              </th>
              <th className="text-center font-bold px-4 py-3">Stat</th>
              <th className="text-left font-bold px-4 py-3 w-1/3">
                {right.name}
                <span className="text-val-muted/70">#{right.tag}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const va = row.get(aggA);
              const vb = row.get(aggB);
              const aWins = va != null && vb != null && va > vb;
              const bWins = va != null && vb != null && vb > va;
              return (
                <tr key={row.label} className="border-b border-val-border/40 last:border-0">
                  <td className={`px-4 py-2.5 text-right font-bold ${aWins ? 'text-val-teal' : ''}`}>
                    {aWins && <span className="mr-1.5">◀</span>}
                    {row.fmt(va)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-val-muted">
                    {row.label}
                  </td>
                  <td className={`px-4 py-2.5 text-left font-bold ${bWins ? 'text-val-teal' : ''}`}>
                    {row.fmt(vb)}
                    {bWins && <span className="ml-1.5">▶</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

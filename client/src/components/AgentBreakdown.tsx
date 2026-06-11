import { useMemo, useState } from 'react';
import FallbackImg from './FallbackImg';
import { useContent } from '../hooks/useContent';
import { fmtNum, fmtPct } from '../utils/formatters';
import { ROLE_COLORS } from '../utils/constants';
import type { AgentAggregate } from '../types';

type SortKey = 'matches' | 'winRate' | 'acs' | 'kda';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'matches', label: 'Matches' },
  { key: 'winRate', label: 'Win %' },
  { key: 'acs', label: 'ACS' },
  { key: 'kda', label: 'KDA' },
];

interface Props {
  agents: AgentAggregate[];
}

/** Top-5 most-played agents, sortable by any column. */
export default function AgentBreakdown({ agents }: Props) {
  const content = useContent();
  const [sortKey, setSortKey] = useState<SortKey>('matches');

  const rows = useMemo(() => {
    const top5 = [...agents].sort((a, b) => b.matches - a.matches).slice(0, 5);
    return top5.sort((a, b) => b[sortKey] - a[sortKey]);
  }, [agents, sortKey]);

  if (!rows.length) {
    return <p className="text-val-muted text-sm">No agent data in this window.</p>;
  }

  return (
    <div className="panel clip-corner overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.18em] text-val-muted border-b border-val-border">
            <th className="text-left font-bold px-4 py-3">Agent</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="text-right font-bold px-4 py-3">
                <button
                  onClick={() => setSortKey(c.key)}
                  className={`uppercase tracking-[0.18em] hover:text-val-cream transition-colors ${
                    sortKey === c.key ? 'text-val-red' : ''
                  }`}
                >
                  {c.label} {sortKey === c.key ? '▾' : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const role = content.agentRole(a.name);
            return (
              <tr key={a.name} className="border-b border-val-border/40 last:border-0 hover:bg-val-panel2/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <FallbackImg
                      src={a.iconUrl ?? content.agentIcon(a.name)}
                      alt={a.name}
                      className="w-9 h-9 object-cover clip-corner border border-val-border shrink-0"
                    />
                    <div>
                      <div className="font-bold">{a.name}</div>
                      {role && (
                        <div
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: ROLE_COLORS[role] ?? '#8FA3B0' }}
                        >
                          {role}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{a.matches}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-val-bg border border-val-border/60 hidden sm:block">
                      <div
                        className={`h-full ${a.winRate >= 0.5 ? 'bg-val-teal' : 'bg-val-red'}`}
                        style={{ width: `${Math.round(a.winRate * 100)}%` }}
                      />
                    </div>
                    <span className={`font-semibold ${a.winRate >= 0.5 ? 'text-val-teal' : 'text-val-red'}`}>
                      {fmtPct(a.winRate)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{a.acs}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmtNum(a.kda, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

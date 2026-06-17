import { fmtInt, fmtNum, fmtPct } from '../utils/formatters';
import { MATCH_COUNT_OPTIONS } from '../utils/constants';
import type { Aggregates } from '../types';

interface Props {
  aggregates: Aggregates;
  size: number;
  onSizeChange?: (size: number) => void;
  compact?: boolean;
}

/** Aggregate performance grid for the last N matches. */
export default function StatsPanel({ aggregates: agg, size, onSizeChange, compact = false }: Props) {
  const tiles: { label: string; value: string; sub?: string; accent?: string }[] = [
    {
      label: 'Record',
      value: `${agg.wins}W – ${agg.losses}L${agg.draws ? ` – ${agg.draws}D` : ''}`,
      sub: `${fmtPct(agg.winRate)} win rate`,
      accent: (agg.winRate ?? 0) >= 0.5 ? '#0FD8B4' : '#FF4655',
    },
    {
      label: 'KDA Ratio',
      value: fmtNum(agg.kda, 2),
      sub: `${fmtInt(agg.kills)} / ${fmtInt(agg.deaths)} / ${fmtInt(agg.assists)}`,
    },
    { label: 'K/D', value: fmtNum(agg.kd, 2) },
    { label: 'ACS', value: fmtInt(agg.acs), sub: 'avg combat score', accent: '#FF4655' },
    { label: 'HS%', value: fmtPct(agg.hsPercent, 1) },
    { label: 'ADR', value: fmtInt(agg.adr), sub: 'dmg / round' },
    { label: 'KAST', value: fmtPct(agg.kastPercent) },
    { label: 'First Bloods', value: fmtNum(agg.firstBloodsPerMatch, 1), sub: 'per match' },
    { label: 'Entry Rate', value: fmtPct(agg.entryRate), sub: 'opening duels / round' },
    { label: 'Entry Success', value: fmtPct(agg.entrySuccess), sub: 'opening duels won' },
    {
      label: 'Clutches',
      value:
        agg.clutchesAttempted > 0 || agg.clutchesWon > 0
          ? `${agg.clutchesWon} / ${agg.clutchesAttempted}`
          : '—',
      sub: 'won / attempted',
    },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">Performance — last {agg.matches} matches</h3>
        {onSizeChange && (
          <div className="flex gap-1">
            {MATCH_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSizeChange(n)}
                className={`px-3 py-1 text-xs font-bold border transition-colors ${
                  size === n
                    ? 'bg-val-red border-val-red text-white'
                    : 'border-val-border text-val-muted hover:border-val-red hover:text-val-cream'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {tiles.map((t) => (
          <div key={t.label} className="panel clip-corner p-4 group hover:border-val-red/60 transition-colors">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-val-muted">
              {t.label}
            </div>
            <div className="text-2xl font-bold mt-1" style={t.accent ? { color: t.accent } : undefined}>
              {t.value}
            </div>
            {t.sub && <div className="text-xs text-val-muted mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

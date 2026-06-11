import FallbackImg from './FallbackImg';
import { useContent } from '../hooks/useContent';
import { fmtPct, fmtSeason, fmtSigned } from '../utils/formatters';
import { tierColor } from '../utils/constants';
import type { Account, MMR } from '../types';

interface Props {
  account: Account;
  mmr: MMR | undefined;
  compact?: boolean;
}

/** Identity banner + rank/RR card. */
export default function PlayerCard({ account, mmr, compact = false }: Props) {
  const content = useContent();
  const cur = mmr?.current;
  const rankIcon = content.tierIcon(cur?.tier.id) ?? undefined;
  const rrPct = Math.max(0, Math.min(100, cur?.rr ?? 0));
  const color = content.tierColorOf(cur?.tier.id) ?? tierColor(cur?.tier.name);

  return (
    <div className="panel clip-corner relative overflow-hidden">
      {/* player-card banner art */}
      {account.card.wide && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${account.card.wide})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-val-bg/80 via-transparent to-val-bg/90" />

      <div className={`relative flex flex-col sm:flex-row gap-5 ${compact ? 'p-4' : 'p-5'}`}>
        {/* identity */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <FallbackImg
            src={account.card.small}
            alt={account.name}
            className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} object-cover clip-corner border border-val-border shrink-0`}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className={`${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold truncate`}>
                {account.name}
              </h2>
              <span className="text-val-muted font-semibold">#{account.tag}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs uppercase tracking-widest text-val-muted">
              {account.accountLevel != null && (
                <span className="border border-val-border bg-val-bg/60 px-2 py-0.5">
                  LVL {account.accountLevel}
                </span>
              )}
              {mmr?.region && (
                <span className="border border-val-border bg-val-bg/60 px-2 py-0.5">
                  {mmr.region.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* rank block */}
        {mmr?.unavailable ? (
          <div className="flex items-center max-w-xs text-sm text-val-muted border-l-2 border-val-gold pl-4">
            {mmr.reason ?? 'Rank data unavailable for this data source.'}
          </div>
        ) : (
          cur && (
            <div className="flex items-center gap-4">
              <FallbackImg
                src={rankIcon}
                alt={cur.tier.name ?? 'Unranked'}
                fallbackText="R"
                className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} object-contain shrink-0`}
              />
              <div className="min-w-[180px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold uppercase tracking-wide" style={{ color }}>
                    {cur.tier.name ?? 'Unranked'}
                  </span>
                  {cur.lastChange != null && (
                    <span
                      className={`text-sm font-bold ${cur.lastChange >= 0 ? 'text-val-teal' : 'text-val-red'}`}
                    >
                      {fmtSigned(cur.lastChange)} {cur.lastChange >= 0 ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* RR progress to next division */}
                <div className="mt-1.5">
                  <div className="h-1.5 bg-val-bg/80 border border-val-border/60 w-full">
                    <div className="h-full" style={{ width: `${rrPct}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex justify-between text-[11px] uppercase tracking-wider text-val-muted mt-1">
                    <span>{cur.rr ?? 0} RR</span>
                    {cur.elo != null && <span>{cur.elo} ELO</span>}
                  </div>
                </div>

                {/* act record + peak */}
                <div className="flex items-center gap-3 mt-2 text-xs uppercase tracking-wider">
                  {mmr.act.wins != null && (
                    <span>
                      <b className="text-val-teal">{mmr.act.wins}W</b>
                      <span className="text-val-muted"> — </span>
                      <b className="text-val-red">{mmr.act.losses}L</b>
                      <span className="text-val-muted ml-1">({fmtPct(mmr.act.winRate)})</span>
                    </span>
                  )}
                  {mmr.peak.tier.name && (
                    <span className="text-val-muted border border-val-gold/40 text-val-gold px-1.5 py-0.5">
                      PEAK {mmr.peak.tier.name}
                      {mmr.peak.season ? ` · ${fmtSeason(mmr.peak.season)}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

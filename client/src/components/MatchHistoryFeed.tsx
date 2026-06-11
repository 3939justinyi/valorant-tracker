import FallbackImg from './FallbackImg';
import { useContent } from '../hooks/useContent';
import { fmtDuration, fmtSigned, relativeTime } from '../utils/formatters';
import type { MatchSummary } from '../types';

interface Props {
  matches: MatchSummary[];
  onSelect: (matchId: string) => void;
}

const RESULT_STYLES: Record<MatchSummary['result'], { border: string; badge: string; label: string }> = {
  win: { border: 'border-l-val-teal', badge: 'bg-val-teal/15 text-val-teal', label: 'W' },
  loss: { border: 'border-l-val-red', badge: 'bg-val-red/15 text-val-red', label: 'L' },
  draw: { border: 'border-l-val-muted', badge: 'bg-val-muted/15 text-val-muted', label: 'D' },
};

/** Recent competitive matches — click a row for the full scoreboard. */
export default function MatchHistoryFeed({ matches, onSelect }: Props) {
  const content = useContent();

  if (!matches.length) {
    return <p className="text-val-muted text-sm">No competitive matches found in this window.</p>;
  }

  return (
    <div className="space-y-2">
      {matches.map((m) => {
        const style = RESULT_STYLES[m.result];
        return (
          <button
            key={m.matchId}
            onClick={() => onSelect(m.matchId)}
            className={`w-full text-left panel border-l-4 ${style.border} hover:bg-val-panel2/70 transition-colors group`}
          >
            <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5">
              {/* result badge + score */}
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className={`w-8 h-8 flex items-center justify-center font-bold text-lg ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-[11px] font-semibold text-val-muted mt-0.5">{m.score}</span>
              </div>

              {/* agent */}
              <FallbackImg
                src={m.agent.iconUrl ?? content.agentIcon(m.agent.name)}
                alt={m.agent.name}
                className="w-10 h-10 object-cover clip-corner border border-val-border shrink-0"
              />

              {/* map + time */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FallbackImg
                  src={content.mapIcon(m.map)}
                  alt={m.map}
                  className="hidden sm:block w-20 h-10 object-cover clip-corner border border-val-border shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold uppercase tracking-wide truncate">{m.map}</div>
                  <div className="text-xs text-val-muted">
                    {relativeTime(m.startedAt)} · {fmtDuration(m.lengthMs)}
                  </div>
                </div>
              </div>

              {/* stats */}
              <div className="hidden md:flex flex-col items-end w-24 shrink-0">
                <span className="font-bold">
                  {m.stats.kills} / {m.stats.deaths} / {m.stats.assists}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-val-muted">K / D / A</span>
              </div>
              <div className="flex flex-col items-end w-16 shrink-0">
                <span className="font-bold text-val-cream">{m.stats.acs}</span>
                <span className="text-[11px] uppercase tracking-wider text-val-muted">ACS</span>
              </div>

              {/* RR delta */}
              <div className="hidden sm:flex flex-col items-end w-14 shrink-0">
                {m.rr.change != null ? (
                  <>
                    <span className={`font-bold ${m.rr.change >= 0 ? 'text-val-teal' : 'text-val-red'}`}>
                      {fmtSigned(m.rr.change)}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-val-muted">RR</span>
                  </>
                ) : (
                  <span className="text-val-muted">—</span>
                )}
              </div>

              <span className="text-val-muted group-hover:text-val-red transition-colors shrink-0">›</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

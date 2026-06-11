import { useEffect } from 'react';
import FallbackImg from './FallbackImg';
import { useContent } from '../hooks/useContent';
import { useMatchDetail } from '../hooks/useMatches';
import { errorMessage } from '../api/riotApi';
import { fmtDuration, fmtPct, relativeTime } from '../utils/formatters';
import { TableSkeleton } from './LoadingSkeleton';
import type { MatchDetail, ScoreboardPlayer } from '../types';

interface Props {
  region: string;
  matchId: string | null;
  highlight: { name: string; tag: string } | null;
  onClose: () => void;
}

/** Full 10-player scoreboard, fetched lazily when a match is opened. */
export default function MatchDetailModal({ region, matchId, highlight, onClose }: Props) {
  const detail = useMatchDetail(matchId ? region : null, matchId);

  useEffect(() => {
    if (!matchId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [matchId, onClose]);

  if (!matchId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="panel clip-corner w-full max-w-4xl my-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {detail.isPending && (
          <div className="p-6">
            <TableSkeleton rows={11} />
          </div>
        )}

        {detail.isError && (
          <div className="p-8 text-center">
            <p className="text-val-red font-bold mb-2">Couldn't load the scoreboard</p>
            <p className="text-val-muted text-sm mb-4">{errorMessage(detail.error)}</p>
            <button
              onClick={onClose}
              className="clip-corner bg-val-red text-white font-bold uppercase tracking-widest px-5 py-2"
            >
              Close
            </button>
          </div>
        )}

        {detail.data && <Scoreboard detail={detail.data} highlight={highlight} onClose={onClose} />}
      </div>
    </div>
  );
}

function Scoreboard({
  detail,
  highlight,
  onClose,
}: {
  detail: MatchDetail;
  highlight: { name: string; tag: string } | null;
  onClose: () => void;
}) {
  const content = useContent();
  const splash = content.mapSplash(detail.map);

  const isHighlighted = (p: ScoreboardPlayer) =>
    !!highlight &&
    p.name.toLowerCase() === highlight.name.toLowerCase() &&
    p.tag.toLowerCase() === highlight.tag.toLowerCase();

  // Show the searched player's team first.
  const myTeam = detail.players.find(isHighlighted)?.team ?? 'Red';
  const otherTeam = myTeam === 'Red' ? 'Blue' : 'Red';

  return (
    <>
      {/* header with map splash */}
      <div className="relative overflow-hidden">
        {splash && (
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${splash})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-val-panel" />
        <div className="relative flex items-end justify-between p-5 pt-8">
          <div>
            <div className="text-2xl font-bold uppercase tracking-wide">{detail.map}</div>
            <div className="text-xs uppercase tracking-widest text-val-muted">
              {detail.mode} · {relativeTime(detail.startedAt)} · {fmtDuration(detail.lengthMs)}
            </div>
          </div>
          <div className="text-3xl font-bold">
            <span className={teamColor(detail, myTeam)}>{teamScore(detail, myTeam)}</span>
            <span className="text-val-muted mx-2">:</span>
            <span className={teamColor(detail, otherTeam)}>{teamScore(detail, otherTeam)}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border border-val-border text-val-muted hover:text-val-cream hover:border-val-red transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        <TeamTable detail={detail} team={myTeam} isHighlighted={isHighlighted} />
        <TeamTable detail={detail} team={otherTeam} isHighlighted={isHighlighted} />
      </div>
    </>
  );
}

const teamScore = (d: MatchDetail, team: string) =>
  team === 'Red' ? d.teams.red.roundsWon : d.teams.blue.roundsWon;
const teamWon = (d: MatchDetail, team: string) => (team === 'Red' ? d.teams.red.won : d.teams.blue.won);
const teamColor = (d: MatchDetail, team: string) => (teamWon(d, team) ? 'text-val-teal' : 'text-val-red');

function TeamTable({
  detail,
  team,
  isHighlighted,
}: {
  detail: MatchDetail;
  team: string;
  isHighlighted: (p: ScoreboardPlayer) => boolean;
}) {
  const content = useContent();
  const players = detail.players
    .filter((p) => p.team === team)
    .sort((a, b) => b.stats.acs - a.stats.acs);

  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${teamColor(detail, team)}`}>
        {teamWon(detail, team) ? 'Victory' : 'Defeat'} — {teamScore(detail, team)} rounds
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-val-muted border-b border-val-border">
              <th className="text-left font-bold py-2 pr-2">Player</th>
              <th className="text-right font-bold py-2 px-2">ACS</th>
              <th className="text-right font-bold py-2 px-2">K</th>
              <th className="text-right font-bold py-2 px-2">D</th>
              <th className="text-right font-bold py-2 px-2">A</th>
              <th className="text-right font-bold py-2 px-2">+/-</th>
              <th className="text-right font-bold py-2 px-2">ADR</th>
              <th className="text-right font-bold py-2 pl-2">HS%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const diff = p.stats.kills - p.stats.deaths;
              const hl = isHighlighted(p);
              return (
                <tr
                  key={p.puuid || `${p.name}#${p.tag}`}
                  className={`border-b border-val-border/30 last:border-0 ${
                    hl ? 'bg-val-red/10 border-l-2 border-l-val-red' : ''
                  }`}
                >
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FallbackImg
                        src={p.agent.iconUrl ?? content.agentIcon(p.agent.name)}
                        alt={p.agent.name}
                        className="w-8 h-8 object-cover clip-corner border border-val-border shrink-0"
                      />
                      <FallbackImg
                        src={content.tierIcon(p.tier.id)}
                        alt={p.tier.name ?? 'Unranked'}
                        fallbackText="·"
                        className="w-5 h-5 object-contain shrink-0"
                      />
                      <span className={`truncate ${hl ? 'font-bold text-val-cream' : ''}`}>
                        {p.name} <span className="text-val-muted text-xs">#{p.tag}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-bold">{p.stats.acs}</td>
                  <td className="py-2 px-2 text-right">{p.stats.kills}</td>
                  <td className="py-2 px-2 text-right">{p.stats.deaths}</td>
                  <td className="py-2 px-2 text-right">{p.stats.assists}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${diff > 0 ? 'text-val-teal' : diff < 0 ? 'text-val-red' : 'text-val-muted'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="py-2 px-2 text-right">{p.stats.adr}</td>
                  <td className="py-2 pl-2 text-right">{fmtPct(p.stats.hsPercent)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

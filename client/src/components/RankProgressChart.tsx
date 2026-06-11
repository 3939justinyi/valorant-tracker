import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtDateShort, fmtSigned } from '../utils/formatters';
import { tierColor } from '../utils/constants';
import type { ProgressionPoint } from '../types';

interface Props {
  progression: ProgressionPoint[];
}

// Tier divisions sit every 100 elo: 1500 = Diamond 1 floor, etc.
const TIER_BASES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];
function tierNameForElo(elo: number): string {
  const idx = Math.min(24, Math.floor(elo / 100));
  if (idx >= 24) return 'Radiant';
  return `${TIER_BASES[Math.floor(idx / 3)]} ${(idx % 3) + 1}`;
}

function RRTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: ProgressionPoint = payload[0].payload;
  const win = p.result === 'win';
  return (
    <div className="panel p-3 text-sm">
      <div className="font-bold mb-1">{fmtDateShort(p.date)}</div>
      <div className={`font-bold uppercase tracking-wider ${win ? 'text-val-teal' : 'text-val-red'}`}>
        {p.result} {p.rrChange != null && `(${fmtSigned(p.rrChange)} RR)`}
      </div>
      <div className="text-val-muted mt-0.5">
        {p.tierName ?? tierNameForElo(p.eloAfter ?? 0)} — {p.rrAfter ?? 0} RR
      </div>
    </div>
  );
}

/** RR (absolute elo) over the last ~20 matches with tier-boundary lines. */
export default function RankProgressChart({ progression }: Props) {
  const data = progression
    .filter((p) => p.eloAfter != null)
    .map((p) => ({ ...p, dateLabel: fmtDateShort(p.date) }));

  if (data.length < 2) {
    return (
      <div className="panel clip-corner p-6 text-val-muted text-sm">
        RR history unavailable for this data source — play more competitive matches or switch to a
        source that exposes MMR history.
      </div>
    );
  }

  const elos = data.map((d) => d.eloAfter as number);
  const min = Math.min(...elos);
  const max = Math.max(...elos);
  const domainMin = Math.max(0, Math.floor((min - 30) / 50) * 50);
  const domainMax = Math.ceil((max + 30) / 50) * 50;

  // Tier boundaries (multiples of 100) inside the visible window.
  const boundaries: number[] = [];
  for (let e = Math.ceil(domainMin / 100) * 100; e <= domainMax; e += 100) boundaries.push(e);

  return (
    <div className="panel clip-corner p-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: -16, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid stroke="#24384A" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#8FA3B0', fontSize: 11, fontFamily: 'Rajdhani' }}
            axisLine={{ stroke: '#24384A' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fill: '#8FA3B0', fontSize: 11, fontFamily: 'Rajdhani' }}
            axisLine={{ stroke: '#24384A' }}
            tickLine={false}
          />
          {boundaries.map((elo) => {
            const name = tierNameForElo(elo);
            return (
              <ReferenceLine
                key={elo}
                y={elo}
                stroke={tierColor(name)}
                strokeOpacity={0.35}
                strokeDasharray="4 4"
                label={{
                  value: name,
                  position: 'insideTopRight',
                  fill: tierColor(name),
                  fontSize: 10,
                  fontFamily: 'Rajdhani',
                  opacity: 0.8,
                }}
              />
            );
          })}
          <Tooltip content={<RRTooltip />} cursor={{ stroke: '#8FA3B0', strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey="eloAfter"
            stroke="#FF4655"
            strokeWidth={2}
            dot={{ r: 3, fill: '#FF4655', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#ECE8E1' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

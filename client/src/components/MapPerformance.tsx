import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MapAggregate } from '../types';

interface Props {
  maps: MapAggregate[];
}

function MapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const m: MapAggregate & { winPct: number } = payload[0].payload;
  return (
    <div className="panel p-3 text-sm">
      <div className="font-bold uppercase tracking-wider mb-1">{m.name}</div>
      <div className="text-val-muted">
        {m.wins}W – {m.losses}L ({m.winPct}%)
      </div>
      <div className="text-val-muted">{m.acs} avg ACS</div>
    </div>
  );
}

/** Win rate per map as a horizontal bar chart (ACS + record in the tooltip). */
export default function MapPerformance({ maps }: Props) {
  if (!maps.length) {
    return <p className="text-val-muted text-sm">No map data in this window.</p>;
  }

  const data = maps.map((m) => ({ ...m, winPct: Math.round(m.winRate * 100) }));
  const height = Math.max(180, data.length * 46);

  return (
    <div className="panel clip-corner p-4">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="#24384A" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: '#8FA3B0', fontSize: 11, fontFamily: 'Rajdhani' }}
            axisLine={{ stroke: '#24384A' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: '#ECE8E1', fontSize: 12, fontFamily: 'Rajdhani', fontWeight: 600 }}
            axisLine={{ stroke: '#24384A' }}
            tickLine={false}
          />
          <Tooltip content={<MapTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="winPct" barSize={16} radius={[0, 2, 2, 0]} label={{ position: 'right', fill: '#8FA3B0', fontSize: 11, formatter: (v: number) => `${v}%` }}>
            {data.map((m) => (
              <Cell key={m.name} fill={m.winPct >= 50 ? '#0FD8B4' : '#FF4655'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

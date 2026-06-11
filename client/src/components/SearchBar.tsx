import { useState, type FormEvent } from 'react';
import { REGIONS } from '../utils/constants';
import { parseRiotId } from '../utils/formatters';
import type { PlayerQuery, Region } from '../types';

interface Props {
  onSearch: (query: PlayerQuery) => void;
  initialRegion?: Region;
  size?: 'lg' | 'sm';
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  onSearch,
  initialRegion = 'na',
  size = 'lg',
  placeholder = 'Riot ID — e.g. TenZ#000',
  autoFocus = false,
}: Props) {
  const [value, setValue] = useState('');
  const [region, setRegion] = useState<Region>(initialRegion);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseRiotId(value);
    if (!parsed) {
      setError('Use the format Name#Tag — e.g. TenZ#000');
      return;
    }
    setError(null);
    onSearch({ region, ...parsed });
  };

  const heights = size === 'lg' ? 'h-12 text-lg' : 'h-10 text-sm';

  return (
    <form onSubmit={submit} className="w-full">
      <div className={`flex w-full ${error ? 'mb-1' : ''}`}>
        <select
          aria-label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className={`${heights} bg-val-panel2 border border-val-border border-r-0 px-2 font-semibold uppercase tracking-wider text-val-muted focus:outline-none focus:border-val-red`}
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          className={`${heights} flex-1 min-w-0 bg-val-panel border border-val-border px-4 placeholder:text-val-muted/50 focus:outline-none focus:border-val-red`}
        />
        <button
          type="submit"
          className={`${heights} clip-corner bg-val-red hover:bg-val-red/85 active:bg-val-red/70 text-white font-bold uppercase tracking-widest px-5 sm:px-7 transition-colors`}
        >
          Search
        </button>
      </div>
      {error && <p className="text-val-red text-sm">{error}</p>}
    </form>
  );
}

import 'dotenv/config';
import * as mock from './mockAdapter.js';
import * as henrik from './henrikAdapter.js';
import * as riot from './riotAdapter.js';

// Pick the data source once at boot:
//   DATA_SOURCE=mock|henrik|riot, or auto (default):
//   henrik if HENRIK_API_KEY → riot if RIOT_API_KEY → mock.
const ADAPTERS = { mock, henrik, riot };

function resolve() {
  const explicit = (process.env.DATA_SOURCE ?? 'auto').toLowerCase();
  if (explicit !== 'auto') {
    if (!ADAPTERS[explicit]) {
      console.warn(`[valtracker] Unknown DATA_SOURCE "${explicit}" — falling back to mock.`);
      return 'mock';
    }
    return explicit;
  }
  if (process.env.HENRIK_API_KEY) return 'henrik';
  if (process.env.RIOT_API_KEY) return 'riot';
  return 'mock';
}

export const dataSource = resolve();
export const source = ADAPTERS[dataSource];

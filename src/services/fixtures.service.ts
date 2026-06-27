import api from './auth.service';

export interface PLFixtures {
  gwMap: Record<string, number>;
  fixtures: { matchday: number; home: string; away: string; date: string; status: string }[];
  currentGW: number;
  maxGW: number;
  cachedAt: string;
}

let _plCache: Promise<PLFixtures> | null = null;

export const fixturesService = {
  async getPL(): Promise<PLFixtures> {
    if (!_plCache) {
      _plCache = api.get<PLFixtures>('/api/fixtures/pl')
        .then(r => r.data)
        .catch(e => { _plCache = null; throw e; });
    }
    return _plCache;
  },
};

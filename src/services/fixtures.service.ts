import api from './auth.service';

export interface PLFixtures {
  gwMap: Record<string, number>;
  fixtures: { matchday: number; home: string; away: string; date: string; status: string }[];
  currentGW: number;
  maxGW: number;
  cachedAt: string;
}

export const fixturesService = {
  async getPL(): Promise<PLFixtures> {
    const { data } = await api.get<PLFixtures>('/api/fixtures/pl');
    return data;
  },
};

import api from './api';

export interface PlayerStat {
  player: string;
  nation: string;
  position: string;
  squad: string;
  comp: string;
  born: number;
  mp: number;
  starts: number;
  mins_played: number;
  ninety_mins_played: number;
  goals: number;
  assists: number;
  xg: number;
  xag: number;
  non_penalty_xg: number;
  goals_per_90: number;
  assists_per_90: number;
  xg_per_90: number;
  xag_per_90: number;
  progressive_carries: number;
  progressive_passes: number;
  tackles: number;
  interceptions: number;
  shots: number;
  shots_on_target: number;
  pass_completion_pct: number;
  yellow_cards: number;
  red_cards: number;
  saves?: number;
  clean_sheets?: number;
  ga_per_90?: number;
}

let _allStatsCache: Promise<PlayerStat[]> | null = null;

export const playerStatsService = {
  async getAll(params?: { squad?: string; position?: string; limit?: number }): Promise<PlayerStat[]> {
    if (!params || (!params.squad && !params.position && !params.limit)) {
      if (!_allStatsCache) {
        _allStatsCache = api.get<{ items: PlayerStat[] }>('/api/player-stats')
          .then(r => r.data.items ?? [])
          .catch(e => { _allStatsCache = null; throw e; });
      }
      return _allStatsCache;
    }
    const { data } = await api.get<{ items: PlayerStat[] }>('/api/player-stats', { params });
    return data.items ?? [];
  },

  async getByName(name: string): Promise<PlayerStat | null> {
    try {
      const { data } = await api.get<PlayerStat>(`/api/player-stats/${encodeURIComponent(name)}`);
      return data;
    } catch {
      return null;
    }
  },

  age(p: PlayerStat): number {
    return p.born ? new Date().getFullYear() - Math.floor(p.born) : 0;
  },
};

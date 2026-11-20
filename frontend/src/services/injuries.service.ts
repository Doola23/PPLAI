import api from './api';

export interface InjuryPrediction {
  player_name: string;
  match_date: string;
  team: string;
  position_group: string;
  injury_probability: string;
  risk_tier: string;
  predicted_high_risk: string;
  currently_injured: string;
  chance_of_playing: string;
  fpl_status_injured: string;
  fpl_status_doubtful: string;
  age: string;
  muscle_injury_history: string;
  hamstring_history: string;
  injuries_last_6m: string;
  injuries_last_12m: string;
  season: string;
  minutes_played_this_match: number;
}

export interface InjurySummary {
  teams: string[];
  referenceDates: string[];
  highRiskFlags: number;
  total: number;
}

let _summaryCache: Promise<InjurySummary> | null = null;

export const injuriesService = {
  async getSummary(): Promise<InjurySummary> {
    if (!_summaryCache) {
      _summaryCache = api.get<InjurySummary>('/api/injuries/summary')
        .then(r => r.data)
        .catch(e => { _summaryCache = null; throw e; });
    }
    return _summaryCache;
  },

  async getTeamDates(team: string): Promise<string[]> {
    const { data } = await api.get<{ dates: string[] }>(`/api/injuries/teams/${encodeURIComponent(team)}/dates`);
    return data.dates ?? [];
  },

  // Highest-risk players, one row per player (their latest match).
  async getTop(limit = 4, team?: string): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/top', {
      params: { limit, ...(team ? { team } : {}) },
    });
    return data.items ?? [];
  },

  async getSquad(team: string, date: string): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions', {
      params: { team, date, limit: 100 },
    });
    return data.items ?? [];
  },

  async getPlayerPredictions(playerName: string): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions', {
      params: { playerName, limit: 100 },
    });
    return data.items ?? [];
  },

  // Internal ranking score only — the model's raw probability isn't calibrated (no Platt/isotonic
  // step, and scale_pos_weight inflates it), so it's never shown to the user as a literal percentage.
  // Validated signal is the binary risk_tier (top 15% by score = High Risk, 11.4% actual rate
  // vs 5.2% for Low Risk — see injury_prediction/README.md).
  rankScore(p: InjuryPrediction): number {
    return parseFloat(p.injury_probability) || 0;
  },

  riskLevel(p: InjuryPrediction): 'High' | 'Low' {
    return p.risk_tier === 'High Risk' ? 'High' : 'Low';
  },
};

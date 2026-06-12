import api from './api';

export interface MatchPrediction {
  home_team: string;
  away_team: string;
  home_win_pct: string;
  draw_pct: string;
  away_win_pct: string;
  xg_home: string;
  xg_away: string;
  pred_home: string;
  pred_away: string;
  dc_draw_prob: string;
}

export interface StandingsRow {
  Team: string;
  Actual_Pos: number;
  Actual_Pts: number;
  Predicted_Pos: number;
  Predicted_Pts: number;
  Diff: number;
  Within_2: boolean;
}

export const matchesService = {
  async getAllPredictions(): Promise<MatchPrediction[]> {
    const { data } = await api.get<{ items: MatchPrediction[] }>('/api/matches/predictions');
    return data.items ?? [];
  },

  async getPrediction(homeTeam: string, awayTeam: string): Promise<MatchPrediction> {
    const { data } = await api.get<MatchPrediction>('/api/matches/predictions', {
      params: { homeTeam, awayTeam },
    });
    return data;
  },

  async getStandingsComparison(): Promise<StandingsRow[]> {
    const { data } = await api.get<{ items: StandingsRow[] }>('/api/matches/output/standings/comparison');
    return data.items ?? [];
  },

  async getActualStandings(): Promise<StandingsRow[]> {
    const { data } = await api.get<{ items: StandingsRow[] }>('/api/matches/output/standings/actual');
    return data.items ?? [];
  },

  async getPredictedStandings(): Promise<StandingsRow[]> {
    const { data } = await api.get<{ items: StandingsRow[] }>('/api/matches/output/standings/predicted');
    return data.items ?? [];
  },
};

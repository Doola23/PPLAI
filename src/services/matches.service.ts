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

// Real Monte Carlo season-simulation output (2,000 simulations) -- only present on the
// /standings/predicted endpoint, not the comparison one.
export interface PredictedStandingsRow extends StandingsRow {
  'Win Probability (%)'?: number;
  'Top 4 Prob (%)'?: number;
  'Relegation Prob (%)'?: number;
  'Avg Points'?: number;
  'Avg Position'?: number;
  'Points Std Dev'?: number;
}

export interface SeasonStats {
  Team: string;
  Matches: number; Wins: number; Draws: number; Losses: number;
  Goals_For: number; Goals_Against: number;
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

  async getPredictedStandings(): Promise<PredictedStandingsRow[]> {
    const { data } = await api.get<{ items: PredictedStandingsRow[] }>('/api/matches/output/standings/predicted');
    return data.items ?? [];
  },

  async getSeasonStats(): Promise<SeasonStats[]> {
    const { data } = await api.get<{ items: SeasonStats[] }>('/api/matches/output/analyst/season');
    return data.items ?? [];
  },

  async getLast5Stats(): Promise<SeasonStats[]> {
    const { data } = await api.get<{ items: SeasonStats[] }>('/api/matches/output/analyst/last5');
    return data.items ?? [];
  },
};

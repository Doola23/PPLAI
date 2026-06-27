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

let _allPredictionsCache: Promise<MatchPrediction[]> | null = null;
let _standingsCompCache: Promise<StandingsRow[]> | null = null;
let _standingsActualCache: Promise<StandingsRow[]> | null = null;
let _standingsPredictedCache: Promise<PredictedStandingsRow[]> | null = null;
let _seasonStatsCache: Promise<SeasonStats[]> | null = null;
let _last5StatsCache: Promise<SeasonStats[]> | null = null;

export const matchesService = {
  async getAllPredictions(): Promise<MatchPrediction[]> {
    if (!_allPredictionsCache) {
      _allPredictionsCache = api.get<{ items: MatchPrediction[] }>('/api/matches/predictions')
        .then(r => r.data.items ?? [])
        .catch(e => { _allPredictionsCache = null; throw e; });
    }
    return _allPredictionsCache;
  },

  async getPrediction(homeTeam: string, awayTeam: string): Promise<MatchPrediction> {
    const { data } = await api.get<MatchPrediction>('/api/matches/predictions', {
      params: { homeTeam, awayTeam },
    });
    return data;
  },

  async getStandingsComparison(): Promise<StandingsRow[]> {
    if (!_standingsCompCache) {
      _standingsCompCache = api.get<{ items: StandingsRow[] }>('/api/matches/output/standings/comparison')
        .then(r => r.data.items ?? [])
        .catch(e => { _standingsCompCache = null; throw e; });
    }
    return _standingsCompCache;
  },

  async getActualStandings(): Promise<StandingsRow[]> {
    if (!_standingsActualCache) {
      _standingsActualCache = api.get<{ items: StandingsRow[] }>('/api/matches/output/standings/actual')
        .then(r => r.data.items ?? [])
        .catch(e => { _standingsActualCache = null; throw e; });
    }
    return _standingsActualCache;
  },

  async getPredictedStandings(): Promise<PredictedStandingsRow[]> {
    if (!_standingsPredictedCache) {
      _standingsPredictedCache = api.get<{ items: PredictedStandingsRow[] }>('/api/matches/output/standings/predicted')
        .then(r => r.data.items ?? [])
        .catch(e => { _standingsPredictedCache = null; throw e; });
    }
    return _standingsPredictedCache;
  },

  async getSeasonStats(): Promise<SeasonStats[]> {
    if (!_seasonStatsCache) {
      _seasonStatsCache = api.get<{ items: SeasonStats[] }>('/api/matches/output/analyst/season')
        .then(r => r.data.items ?? [])
        .catch(e => { _seasonStatsCache = null; throw e; });
    }
    return _seasonStatsCache;
  },

  async getLast5Stats(): Promise<SeasonStats[]> {
    if (!_last5StatsCache) {
      _last5StatsCache = api.get<{ items: SeasonStats[] }>('/api/matches/output/analyst/last5')
        .then(r => r.data.items ?? [])
        .catch(e => { _last5StatsCache = null; throw e; });
    }
    return _last5StatsCache;
  },
};

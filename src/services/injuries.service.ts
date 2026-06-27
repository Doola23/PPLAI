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

let _predictionsCache: Promise<InjuryPrediction[]> | null = null;

export const injuriesService = {
  async getPredictions(): Promise<InjuryPrediction[]> {
    if (!_predictionsCache) {
      _predictionsCache = api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions')
        .then(r => r.data.items ?? [])
        .catch(e => { _predictionsCache = null; throw e; });
    }
    return _predictionsCache;
  },

  async getPlayerPredictions(playerName: string): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions', {
      params: { playerName },
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

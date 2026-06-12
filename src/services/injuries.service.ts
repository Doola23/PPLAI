import api from './api';

export interface InjuryPrediction {
  player_name: string;
  match_date: string;
  team: string;
  position_group: string;
  injury_probability: string;
  chance_of_playing: string;
  predicted_high_risk: string;
  currently_injured: string;
  fpl_status_injured: string;
  fpl_status_doubtful: string;
  age: string;
  muscle_injury_history: string;
  hamstring_history: string;
  injuries_last_6m: string;
  injuries_last_12m: string;
  total_days_missed: string;
  season: string;
}

export const injuriesService = {
  async getPredictions(limit = 100): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions', {
      params: { limit },
    });
    return data.items ?? [];
  },

  async getPlayerPredictions(playerName: string): Promise<InjuryPrediction[]> {
    const { data } = await api.get<{ items: InjuryPrediction[] }>('/api/injuries/predictions', {
      params: { playerName },
    });
    return data.items ?? [];
  },

  riskPct(p: InjuryPrediction): number {
    return Math.round(parseFloat(p.injury_probability) * 100);
  },

  riskLevel(p: InjuryPrediction): 'High' | 'Medium' | 'Low' | 'Fit' {
    const pct = injuriesService.riskPct(p);
    if (pct >= 65) return 'High';
    if (pct >= 35) return 'Medium';
    if (pct >= 15) return 'Low';
    return 'Fit';
  },
};

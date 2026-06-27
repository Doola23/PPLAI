import api from './api';

export interface PlayerPrediction {
  Player: string;
  Team: string;
  Age: number;
  Position: string;
  Role: string;
  season: string;
  '2025 Predicted Minutes'?: number;
  'Analysis & Trend'?: string;

  '2024 Goals'?: number;
  '2025 Predicted Goals'?: number;
  '2025 Goals (Low Estimate)'?: number;
  '2025 Goals (High Estimate)'?: number;
  '2024 Assists'?: number;
  '2025 Predicted Assists'?: number;
  '2024 Expected Goals (xG)'?: number;
  '2025 Predicted xG'?: number;
  '2024 Shots'?: number;
  '2025 Predicted Shots'?: number;

  '2024 Aerial Duels Won %'?: number;
  '2025 Predicted Aerial Duels Won %'?: number;
  '2024 Pass Completion %'?: number;
  '2025 Predicted Pass Completion %'?: number;
  '2024 Interceptions'?: number;
  '2025 Predicted Interceptions'?: number;
  '2024 Clearances'?: number;
  '2025 Predicted Clearances'?: number;

  '2024 Progressive Passes'?: number;
  '2025 Predicted Progressive Passes'?: number;
  '2024 Key Passes'?: number;
  '2025 Predicted Key Passes'?: number;
  '2024 Tackles+Interceptions'?: number;
  '2025 Predicted Tackles+Interceptions'?: number;
  '2024 Ball Recoveries'?: number;
  '2025 Predicted Ball Recoveries'?: number;
}

let _allCache: Promise<PlayerPrediction[]> | null = null;

export const playerPredictionsService = {
  async getAll(): Promise<PlayerPrediction[]> {
    if (!_allCache) {
      _allCache = api.get<{ items: PlayerPrediction[] }>('/api/player-predictions')
        .then(r => r.data.items ?? [])
        .catch(e => { _allCache = null; throw e; });
    }
    return _allCache;
  },
};

import api from './api';

export interface ScoutPlayer {
  player_squad: string;
  Player: string;
  Squad: string;
  Pos: string;
  Age: number;
  citizenship: string;
  nationality?: string;
  foot: string;
  height: string;
  Min: number;
  Gls: number;
  Ast: number;
  xG: number;
  xAG: number;
  npxG: number;
  SCA: number;
  GCA: number;
  Tkl: number;
  Int: number;
  Clr: number;
  Recov: number;
  PrgC: number;
  PrgP: number;
  goals_per90: number;
  assists_per90: number;
  shots_per90: number;
  sot_per90: number;
  npxg_per90: number;
  xag_per90: number;
  sca_per90: number;
  gca_per90: number;
  tackles_per90: number;
  interceptions_per90: number;
  aerial_won_per90: number;
  prog_carries_per90: number;
  prog_passes_per90: number;
  pass_completion: number;
  market_value_eur: number;
  contract_expires: string;
  img_url: string;
  '90s': number;
  total_injuries: number;
  recent_injuries: number;
  total_days_missed: number;
  recent_days_missed: number;
  goals_per90_zscore: number;
  assists_per90_zscore: number;
  npxg_per90_zscore: number;
  xag_per90_zscore: number;
  tackles_per90_zscore: number;
  interceptions_per90_zscore: number;
  prog_carries_per90_zscore: number;
  prog_passes_per90_zscore: number;
  successful_takeons_per90_zscore: number;
  pass_completion_zscore: number;
}

export const scoutingService = {
  async getCurrent(params?: { position?: string; team?: string; limit?: number }): Promise<ScoutPlayer[]> {
    const { data } = await api.get<{ items: ScoutPlayer[] }>('/api/scouting/current', { params });
    return data.items ?? [];
  },

  // Returns EVERY current player. /current is a single un-paginated scan (caps at ~1MB),
  // so use /primary, which paginates the full table — needed so all shortlisted players appear.
  async getAll(): Promise<ScoutPlayer[]> {
    const { data } = await api.get<{ current: ScoutPlayer[] }>('/api/scouting/primary');
    return data.current ?? [];
  },

  async getPlayer(playerSquad: string): Promise<ScoutPlayer> {
    const { data } = await api.get<ScoutPlayer>(
      `/api/scouting/current/${encodeURIComponent(playerSquad)}`
    );
    return data;
  },

  rating(p: ScoutPlayer): number {
    const scores = [
      p.goals_per90_zscore ?? 0,
      p.assists_per90_zscore ?? 0,
      p.npxg_per90_zscore ?? 0,
      p.xag_per90_zscore ?? 0,
      p.prog_carries_per90_zscore ?? 0,
      p.prog_passes_per90_zscore ?? 0,
    ];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.min(10, Math.max(0, 5 + avg * 1.2));
  },
};

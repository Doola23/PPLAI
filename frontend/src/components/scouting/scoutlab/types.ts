export type PosGroup = 'FW' | 'WG' | 'MF' | 'DF' | 'GK';
export type PosFilter = PosGroup | 'ALL';
export type Priority = 'required' | 'high' | 'medium' | 'low' | 'none';
export type InjuryRisk = 'High' | 'Medium' | 'Low';
export type Trajectory = 'Improving' | 'Stable' | 'Declining';
export type PotentialTier = 'Elite Prospect' | 'High Potential' | 'Developing';

export type PlayerValue = string | number | boolean | null | undefined;

/** One row of the scouting pool (FBref + Transfermarkt + derived per-90 / z-score columns). */
export interface ScoutPlayer {
  Player: string;
  Squad?: string;
  Pos?: string;
  Age?: number;
  league?: string;
  foot?: string;
  height?: number | string;
  citizenship?: string;
  contract_expires?: string;
  market_value_eur?: number;
  shot_count?: number;
  shot_avg_y?: number;
  /** Fields added client-side when the pool loads. */
  _ml_pos_group?: PosGroup | null;
  _ml_role?: string | null;
  _lateral_side?: 'L' | 'R' | null;
  _potential_tier?: PotentialTier | null;
  matchScore?: number;
  [column: string]: PlayerValue;
}

export interface Attr {
  k: string;
  l: string;
  desc: string;
  c: string[];
  z: string[];
  i: string;
  custom?: (p: ScoutPlayer) => number | null;
  thresholdLabel?: string;
  thresholdKey?: string;
}

export interface AttrCategory {
  cat: string;
  icon: string;
  gkOnly?: boolean;
  attrs: Attr[];
}

export interface ProfileEntry extends Attr {
  value: number;
  percentile: number;
  rating: string;
}

export interface SearchRequest {
  posGroup?: PosFilter;
  ageMin?: number;
  ageMax?: number;
  budgetMin?: number | '';
  budgetMax?: number | '';
  leagues?: string[];
  minMinutes?: number;
  heightMin?: number | '';
  heightMax?: number | '';
  foot?: string;
  contractBefore?: string;
  contractAfter?: string;
  mlRole?: string[];
  nationality?: string;
  similarTo?: string;
  priorities: Record<string, Priority | undefined>;
  thresholds?: Record<string, PlayerValue>;
  subPos?: string;
  potentialTier?: PotentialTier | '';
  gkMinSave?: number | '';
  gkMaxGA?: number | '';
  gkMinCS?: number | '';
}

export interface Shot { x: number; y: number; xg: number; r: string; st: string; sit: string; m: number }
export interface ShotMap { n: string; tm: string; lg: string; g: number; ts: number; sh: Shot[] }
export interface MatchLogEntry { d: string; ht: string; at: string; [stat: string]: string | number }
export interface SimilarPlayer { name: string; team: string; league: number; similarity: number; role: string }

export interface PlayerExtras {
  shots: ShotMap | null;
  logs: MatchLogEntry[] | null;
  similar: SimilarPlayer[];
}

export interface ScoutingPrimary {
  current: ScoutPlayer[];
  previous: ScoutPlayer[];
  meta: { currentSeason: string; previousSeason: string; [key: string]: unknown };
  ml: { roles: Record<string, { cluster: string; pos_group: PosGroup; role: string }>; [key: string]: unknown };
}

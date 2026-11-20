import { describe, it, expect } from 'vitest';
import { calcInjuryRisk, calcPotential, calcTrajectory, getProfile, mv, score, search } from './engine';
import type { ScoutPlayer, SearchRequest } from './types';

const player = (name: string, extra: Partial<ScoutPlayer> = {}): ScoutPlayer => ({
  Player: name, Squad: 'Test FC', Pos: 'FW', Age: 24, league: 'Premier League', Min: 2000,
  goals_per90: 0.5, shots_per90: 3, goals_per90_zscore: 0, ...extra,
});

const pool: ScoutPlayer[] = [
  player('Elite Striker', { goals_per90: 0.9, goals_per90_zscore: 2, shots_per90: 4.5, market_value_eur: 80e6, foot: 'right' }),
  player('Average Striker', { goals_per90: 0.45, goals_per90_zscore: 0, market_value_eur: 20e6, foot: 'left' }),
  player('Poor Striker', { goals_per90: 0.1, goals_per90_zscore: -1.5, shots_per90: 1, market_value_eur: 5e6, foot: 'right' }),
  player('Young Defender', { Pos: 'DF', Age: 19, goals_per90: 0.02, market_value_eur: 10e6 }),
];

const req = (over: Partial<SearchRequest> = {}): SearchRequest => ({ posGroup: 'FW', priorities: { goals: 'high' }, ...over });

describe('search', () => {
  it('filters by position and ranks by fit', () => {
    const r = search(pool, req());
    expect(r.map(p => p.Player)).toEqual(['Elite Striker', 'Average Striker', 'Poor Striker']);
    expect(r[0].matchScore!).toBeGreaterThan(r[2].matchScore!);
  });

  it('applies budget, foot and age filters', () => {
    expect(search(pool, req({ budgetMax: 30e6 })).map(p => p.Player)).toEqual(['Average Striker', 'Poor Striker']);
    expect(search(pool, req({ foot: 'Left' })).map(p => p.Player)).toEqual(['Average Striker']);
    expect(search(pool, req({ posGroup: 'ALL', ageMax: 20 })).map(p => p.Player)).toEqual(['Young Defender']);
  });

  it('required attributes knock out players below the pool average', () => {
    // Forward pool mean goals/90 = (0.9 + 0.45 + 0.1) / 3 ≈ 0.48
    const r = search(pool, req({ priorities: { goals: 'required' } }));
    expect(r.map(p => p.Player)).toEqual(['Elite Striker']);
  });

  it('minimum thresholds are hard filters', () => {
    const r = search(pool, req({ thresholds: { shots_per90: 4 } }));
    expect(r.map(p => p.Player)).toEqual(['Elite Striker']);
  });
});

describe('scoring helpers', () => {
  it('score is 50 when nothing is prioritised', () => {
    expect(score(pool[0], { priorities: {} }, pool, null)).toBe(50);
  });

  it('formats market value', () => {
    expect(mv(pool[0])).toBe('€80M');
    expect(mv(player('x', { market_value_eur: 500e3 }))).toBe('€500K');
    expect(mv(player('x'))).toBe('N/A');
  });

  it('classifies injury risk', () => {
    expect(calcInjuryRisk(player('x'))).toBe('Low');
    expect(calcInjuryRisk(player('x', { recent_injuries: 4, recent_days_missed: 120, total_injuries: 12 }))).toBe('High');
  });

  it('trajectory compares seasons', () => {
    const cur = player('x', { goals_per90: 0.8, assists_per90: 0.4, npxg_per90: 0.7, shots_per90: 4 });
    const prev = player('x', { goals_per90: 0.4, assists_per90: 0.2, npxg_per90: 0.35, shots_per90: 2 });
    expect(calcTrajectory(cur, prev)).toBe('Improving');
    expect(calcTrajectory(prev, cur)).toBe('Declining');
    expect(calcTrajectory(cur, null)).toBeNull();
  });

  it('potential favours young improving players', () => {
    expect(calcPotential(player('x', { Age: 18, goals_per90_zscore: 2, npxg_per90_zscore: 2, assists_per90_zscore: 2 }), 'FW', 'Improving').tier).toBe('Elite Prospect');
    expect(calcPotential(player('x', { Age: 30 }), 'FW', 'Improving')).toEqual({ score: 0, tier: null });
  });

  it('profile is sorted by percentile', () => {
    const prof = getProfile(pool[0], pool, 'ALL');
    const pcts = prof.map(e => e.percentile);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
  });
});

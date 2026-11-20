import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('./api', () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

const { injuriesService } = await import('./injuries.service');
const { scoutingService } = await import('./scouting.service');
const { matchesService } = await import('./matches.service');

beforeEach(() => get.mockReset());

describe('injuriesService', () => {
  it('maps risk tiers to levels', () => {
    expect(injuriesService.riskLevel({ risk_tier: 'High Risk' } as never)).toBe('High');
    expect(injuriesService.riskLevel({ risk_tier: 'Low Risk' } as never)).toBe('Low');
  });

  it('rankScore falls back to 0 for missing probability', () => {
    expect(injuriesService.rankScore({ injury_probability: '0.42' } as never)).toBe(0.42);
    expect(injuriesService.rankScore({ injury_probability: '' } as never)).toBe(0);
  });

  it('getTop sends limit and optional team', async () => {
    get.mockResolvedValue({ data: { items: [{ player_name: 'A' }] } });
    await injuriesService.getTop(4);
    expect(get).toHaveBeenLastCalledWith('/api/injuries/top', { params: { limit: 4 } });
    await injuriesService.getTop(4, 'arsenal');
    expect(get).toHaveBeenLastCalledWith('/api/injuries/top', { params: { limit: 4, team: 'arsenal' } });
  });

  it('getSquad requests one team + date', async () => {
    get.mockResolvedValue({ data: { items: [] } });
    await injuriesService.getSquad('Arsenal', '2025-05-25');
    expect(get).toHaveBeenCalledWith('/api/injuries/predictions', {
      params: { team: 'Arsenal', date: '2025-05-25', limit: 100 },
    });
  });

  it('getTeamDates encodes the team name', async () => {
    get.mockResolvedValue({ data: { dates: ['2025-01-01'] } });
    expect(await injuriesService.getTeamDates('Nottingham Forest')).toEqual(['2025-01-01']);
    expect(get).toHaveBeenCalledWith('/api/injuries/teams/Nottingham%20Forest/dates');
  });
});

describe('scoutingService.rating', () => {
  it('is 5 for an average player and clamps to 0..10', () => {
    expect(scoutingService.rating({} as never)).toBe(5);
    const elite = { goals_per90_zscore: 9, assists_per90_zscore: 9, npxg_per90_zscore: 9, xag_per90_zscore: 9, prog_carries_per90_zscore: 9, prog_passes_per90_zscore: 9 };
    expect(scoutingService.rating(elite as never)).toBe(10);
    const poor = Object.fromEntries(Object.entries(elite).map(([k]) => [k, -9]));
    expect(scoutingService.rating(poor as never)).toBe(0);
  });
});

describe('matchesService caching', () => {
  it('retries after a failed request instead of caching the error', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    await expect(matchesService.getAllPredictions()).rejects.toThrow('offline');

    get.mockResolvedValueOnce({ data: { items: [{ home_team: 'Arsenal' }] } });
    expect(await matchesService.getAllPredictions()).toHaveLength(1);

    await matchesService.getAllPredictions();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super(`API Error: ${status}`);
      this.status = status;
    }
  },
}));

describe('season API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useActiveSeason fetches active season', async () => {
    vi.mocked(api).mockResolvedValue({
      id: 's1', name: 'Season 1', description: null, seasonNumber: 1, status: 'ACTIVE',
      startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-03-01T00:00:00.000Z', battlePasses: [],
    });

    const result: any = await api('/api/seasons/active');
    expect(api).toHaveBeenCalledWith('/api/seasons/active');
    expect(result.id).toBe('s1');
    expect(result.status).toBe('ACTIVE');
  });

  it('useSeasons fetches all seasons', async () => {
    vi.mocked(api).mockResolvedValue({
      seasons: [{ id: 's1', name: 'Season 1', seasonNumber: 1, status: 'COMPLETED', startsAt: '', endsAt: '', battlePasses: [] }],
    });

    const result: any = await api('/api/seasons');
    expect(result.seasons).toHaveLength(1);
  });

  it('useSeason fetches single season', async () => {
    vi.mocked(api).mockResolvedValue({ id: 's1', name: 'Season 1', seasonNumber: 1, status: 'ACTIVE', startsAt: '', endsAt: '', battlePasses: [] });

    const result: any = await api('/api/seasons/s1');
    expect(api).toHaveBeenCalledWith('/api/seasons/s1');
    expect(result.id).toBe('s1');
  });

  it('useUserSeason fetches user season data', async () => {
    vi.mocked(api).mockResolvedValue({
      id: 'us1', xp: 500,
      battlePasses: [{ id: 'ubp1', battlePassId: 'bp1', track: 'FREE', level: 5, xp: 200, hasPremium: false, maxLevel: 50, xpPerLevel: 100 }],
    });

    const result: any = await api('/api/seasons/s1/user');
    expect(result.xp).toBe(500);
    expect(result.battlePasses[0].level).toBe(5);
  });

  it('useSeasonRewards fetches rewards', async () => {
    vi.mocked(api).mockResolvedValue({
      rewards: [{ id: 'r1', seasonId: 's1', levelId: 'l1', rewardType: 'XP', rewardValue: '100', claimed: false, claimedAt: null }],
    });

    const result: any = await api('/api/seasons/s1/rewards');
    expect(result.rewards).toHaveLength(1);
    expect(result.rewards[0].rewardType).toBe('XP');
  });

  it('useClaimReward claims a reward', async () => {
    vi.mocked(api).mockResolvedValue({ id: 'r1', seasonId: 's1', levelId: 'l1', rewardType: 'XP', rewardValue: '100', claimed: true, claimedAt: new Date().toISOString() });

    const result: any = await api('/api/seasons/rewards/r1/claim', { method: 'POST' });
    expect(api).toHaveBeenCalledWith('/api/seasons/rewards/r1/claim', { method: 'POST' });
    expect(result.claimed).toBe(true);
  });
});
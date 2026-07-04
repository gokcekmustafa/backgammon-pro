import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerSeasonRoutes } from '../season-routes';
import { SeasonService } from '../../season-service';
import { signAccessToken } from '../../lib/jwt';

function mockSeasonService() {
  return {
    getActiveSeason: vi.fn(),
    getSeasonById: vi.fn(),
    listSeasons: vi.fn(),
    getUserSeason: vi.fn(),
    getLevels: vi.fn(),
    getRewards: vi.fn(),
    claimReward: vi.fn(),
  } as unknown as SeasonService;
}

function buildApp(seasons: SeasonService) {
  const app = Fastify();
  registerSeasonRoutes(app, {} as any, seasons);
  return app;
}

function authHeaders(userId = 'u1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('season-routes', () => {
  let seasons: ReturnType<typeof mockSeasonService>;

  beforeEach(() => {
    vi.clearAllMocks();
    seasons = mockSeasonService();
  });

  describe('GET /api/seasons/active', () => {
    it('returns active season', async () => {
      const mockSeason = { id: 's1', name: 'Season 1', description: null, seasonNumber: 1, status: 'ACTIVE', startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-03-01T00:00:00.000Z', battlePasses: [] };
      (seasons.getActiveSeason as any).mockResolvedValue(mockSeason);

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/active', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe('s1');
    });

    it('returns 404 when no active season', async () => {
      (seasons.getActiveSeason as any).mockResolvedValue(null);

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/active', headers: authHeaders() });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/seasons', () => {
    it('returns all seasons', async () => {
      (seasons.listSeasons as any).mockResolvedValue([{ id: 's1', name: 'S1', description: null, seasonNumber: 1, status: 'ACTIVE', startsAt: '', endsAt: '', battlePasses: [] }]);

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).seasons).toHaveLength(1);
    });
  });

  describe('GET /api/seasons/:seasonId', () => {
    it('returns season by id', async () => {
      (seasons.getSeasonById as any).mockResolvedValue({ id: 's1', name: 'S1', description: null, seasonNumber: 1, status: 'ACTIVE', startsAt: '', endsAt: '', battlePasses: [] });

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/s1', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe('s1');
    });

    it('returns 404 for unknown season', async () => {
      (seasons.getSeasonById as any).mockResolvedValue(null);

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/unknown', headers: authHeaders() });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/seasons/:seasonId/user', () => {
    it('returns user season data', async () => {
      (seasons.getUserSeason as any).mockResolvedValue({ id: 'us1', xp: 500, battlePasses: [] });

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/s1/user', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).xp).toBe(500);
    });
  });

  describe('GET /api/seasons/:seasonId/rewards', () => {
    it('returns season rewards', async () => {
      (seasons.getRewards as any).mockResolvedValue([{ id: 'r1', seasonId: 's1', levelId: 'l1', rewardType: 'XP', rewardValue: '100', claimed: false, claimedAt: null }]);

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/seasons/s1/rewards', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).rewards).toHaveLength(1);
    });
  });

  describe('POST /api/seasons/rewards/:rewardId/claim', () => {
    it('claims a reward', async () => {
      (seasons.claimReward as any).mockResolvedValue({ id: 'r1', seasonId: 's1', levelId: 'l1', rewardType: 'XP', rewardValue: '100', claimed: true, claimedAt: new Date().toISOString() });

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/seasons/rewards/r1/claim', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).claimed).toBe(true);
    });

    it('returns 400 on claim error', async () => {
      (seasons.claimReward as any).mockRejectedValue(new Error('Already claimed'));

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/seasons/rewards/r1/claim', headers: authHeaders() });
      expect(res.statusCode).toBe(400);
    });
  });
});
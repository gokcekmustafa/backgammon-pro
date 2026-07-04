import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminSeasonRoutes } from '../admin-season-routes';
import { SeasonService } from '../../season-service';
import { signAccessToken } from '../../lib/jwt';

function mockSeasonService() {
  return {
    listSeasons: vi.fn(),
    createSeason: vi.fn(),
    updateSeason: vi.fn(),
    activateSeason: vi.fn(),
    closeSeason: vi.fn(),
    archiveSeason: vi.fn(),
    resetProgression: vi.fn(),
    addRewardToLevel: vi.fn(),
    removeReward: vi.fn(),
  } as unknown as SeasonService;
}

function buildApp(seasons: SeasonService) {
  const app = Fastify();
  const prisma = {
    user: { findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
      if (id === 'admin1') return Promise.resolve({ id, role: 'SUPER_ADMIN' });
      return Promise.resolve(null);
    })},
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  registerAdminSeasonRoutes(app, prisma as any, seasons);
  return app;
}

function adminHeaders(userId = 'admin1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('admin-season-routes', () => {
  let seasons: ReturnType<typeof mockSeasonService>;

  beforeEach(() => {
    vi.clearAllMocks();
    seasons = mockSeasonService();
  });

  describe('GET /api/admin/seasons', () => {
    it('lists seasons', async () => {
      (seasons.listSeasons as any).mockResolvedValue([]);
      const app = buildApp(seasons);
      const res = await app.inject({ method: 'GET', url: '/api/admin/seasons', headers: adminHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/seasons', () => {
    it('creates a season', async () => {
      const payload = {
        name: 'Test Season',
        seasonNumber: 1,
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-03-01T00:00:00.000Z',
        battlePasses: [{ track: 'FREE', label: 'Free Track', maxLevel: 50, xpPerLevel: 100 }],
      };
      (seasons.createSeason as any).mockResolvedValue({
        id: 's1', name: 'Test Season', description: null, seasonNumber: 1, status: 'UPCOMING',
        startsAt: payload.startsAt, endsAt: payload.endsAt, battlePasses: [],
      });

      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/admin/seasons', payload, headers: adminHeaders() });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('POST /api/admin/seasons/:id/activate', () => {
    it('activates a season', async () => {
      (seasons.activateSeason as any).mockResolvedValue();
      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/admin/seasons/s1/activate', headers: adminHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/seasons/:id/close', () => {
    it('closes a season', async () => {
      (seasons.closeSeason as any).mockResolvedValue({} as any);
      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/admin/seasons/s1/close', headers: adminHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/seasons/:id/archive', () => {
    it('archives a season', async () => {
      (seasons.archiveSeason as any).mockResolvedValue({} as any);
      const app = buildApp(seasons);
      const res = await app.inject({ method: 'POST', url: '/api/admin/seasons/s1/archive', headers: adminHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/battle-pass/levels/:levelId/rewards', () => {
    it('adds reward to level', async () => {
      (seasons.addRewardToLevel as any).mockResolvedValue({ id: 'r1', seasonId: 's1', levelId: 'l1', rewardType: 'XP', rewardValue: '100', claimed: false, claimedAt: null });
      const app = buildApp(seasons);
      const res = await app.inject({
        method: 'POST', url: '/api/admin/battle-pass/levels/l1/rewards',
        payload: { rewardType: 'XP', rewardValue: '100' },
        headers: adminHeaders(),
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('DELETE /api/admin/rewards/:rewardId', () => {
    it('removes a reward', async () => {
      (seasons.removeReward as any).mockResolvedValue();
      const app = buildApp(seasons);
      const res = await app.inject({ method: 'DELETE', url: '/api/admin/rewards/r1', headers: adminHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });
});
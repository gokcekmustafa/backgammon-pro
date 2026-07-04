import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminSocialRoutes } from '../admin-social-routes';
import type { SocialService } from '../../social-service';
import { signAccessToken } from '../../lib/jwt';

function mockSocialService() {
  return {
    getFriends: vi.fn(),
    getBlockedUsers: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  } as unknown as SocialService;
}

function authHeaders(userId = 'admin1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

function buildApp(social: SocialService) {
  const app = Fastify();

  const prisma = {
    user: {
      findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
        if (id === 'admin1') return Promise.resolve({ id, role: 'SUPER_ADMIN' });
        return Promise.resolve(null);
      }),
    },
    auditLog: { create: vi.fn() },
  } as any;

  registerAdminSocialRoutes(app, prisma, social);
  return app;
}

describe('admin-social-routes', () => {
  let social: ReturnType<typeof mockSocialService>;

  beforeEach(() => {
    vi.clearAllMocks();
    social = mockSocialService();
  });

  describe('GET /api/admin/social/friends/:userId', () => {
    it('returns friends for a user', async () => {
      const app = buildApp(social);
      social.getFriends.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/admin/social/friends/u1', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).friends).toEqual([]);
    });
  });

  describe('GET /api/admin/social/blocked/:userId', () => {
    it('returns blocked users for a user', async () => {
      const app = buildApp(social);
      social.getBlockedUsers.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/admin/social/blocked/u1', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/social/block', () => {
    it('blocks a user', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'POST', url: '/api/admin/social/block', headers: authHeaders(),
        payload: { blockerId: 'u1', blockedId: 'u2' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/social/unblock', () => {
    it('unblocks a user', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'POST', url: '/api/admin/social/unblock', headers: authHeaders(),
        payload: { blockerId: 'u1', blockedId: 'u2' },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
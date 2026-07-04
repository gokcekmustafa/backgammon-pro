import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerSocialRoutes } from '../social-routes';
import type { SocialService } from '../../social-service';
import { signAccessToken } from '../../lib/jwt';

function mockSocialService() {
  return {
    searchPlayers: vi.fn(),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    cancelFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    getFriends: vi.fn(),
    getFriendRequests: vi.fn(),
    getSentRequests: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    getBlockedUsers: vi.fn(),
    sendInvitation: vi.fn(),
    getInvitations: vi.fn(),
    respondToInvitation: vi.fn(),
    checkPrivacy: vi.fn(),
  } as unknown as SocialService;
}

function buildApp(social: SocialService) {
  const app = Fastify();
  registerSocialRoutes(app, {} as any, social);
  return app;
}

function authHeaders(userId = 'u1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('social-routes', () => {
  let social: ReturnType<typeof mockSocialService>;

  beforeEach(() => {
    vi.clearAllMocks();
    social = mockSocialService();
  });

  describe('GET /api/social/search', () => {
    it('returns search results', async () => {
      const app = buildApp(social);
      social.searchPlayers.mockResolvedValue([{ id: 'u2', displayName: 'Player', username: 'p1', rating: 1200, friendStatus: 'none' }]);
      const res = await app.inject({ method: 'GET', url: '/api/social/search?q=player', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).results).toHaveLength(1);
    });
  });

  describe('GET /api/social/friends', () => {
    it('returns friends list', async () => {
      const app = buildApp(social);
      social.getFriends.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/social/friends', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/social/requests', () => {
    it('returns requests', async () => {
      const app = buildApp(social);
      social.getFriendRequests.mockResolvedValue([]);
      social.getSentRequests.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/social/requests', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/social/requests', () => {
    it('sends friend request', async () => {
      const app = buildApp(social);
      social.sendFriendRequest.mockResolvedValue({});
      const res = await app.inject({
        method: 'POST', url: '/api/social/requests', headers: authHeaders(),
        payload: { receiverId: 'u2' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 on error', async () => {
      const app = buildApp(social);
      social.sendFriendRequest.mockRejectedValue(new Error('Blocked'));
      const res = await app.inject({
        method: 'POST', url: '/api/social/requests', headers: authHeaders(),
        payload: { receiverId: 'u2' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/social/requests/respond', () => {
    it('accepts request', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'PUT', url: '/api/social/requests/respond', headers: authHeaders(),
        payload: { senderId: 'u2', accept: true },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/social/friends/:userId', () => {
    it('removes friend', async () => {
      const app = buildApp(social);
      const res = await app.inject({ method: 'DELETE', url: '/api/social/friends/u2', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/social/block', () => {
    it('blocks user', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'POST', url: '/api/social/block', headers: authHeaders(),
        payload: { receiverId: 'u2' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/social/unblock', () => {
    it('unblocks user', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'POST', url: '/api/social/unblock', headers: authHeaders(),
        payload: { receiverId: 'u2' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/social/blocked', () => {
    it('lists blocked users', async () => {
      const app = buildApp(social);
      social.getBlockedUsers.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/social/blocked', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/social/invitations', () => {
    it('sends invitation', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'POST', url: '/api/social/invitations', headers: authHeaders(),
        payload: { receiverId: 'u2', type: 'TABLE' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/social/invitations', () => {
    it('lists invitations', async () => {
      const app = buildApp(social);
      social.getInvitations.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/api/social/invitations', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/social/invitations/:invitationId', () => {
    it('responds to invitation', async () => {
      const app = buildApp(social);
      const res = await app.inject({
        method: 'PUT', url: '/api/social/invitations/i1', headers: authHeaders(),
        payload: { accept: true },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
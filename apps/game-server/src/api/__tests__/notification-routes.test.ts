import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerNotificationRoutes } from '../notification-routes';
import { NotificationService } from '../../notification-service';
import { signAccessToken } from '../../lib/jwt';

function mockNotificationService() {
  return {
    list: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  } as unknown as NotificationService;
}

function buildApp(notifications: NotificationService) {
  const app = Fastify();
  registerNotificationRoutes(app, {} as any, notifications);
  return app;
}

function authHeaders(userId = 'u1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('notification-routes', () => {
  let notifications: ReturnType<typeof mockNotificationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    notifications = mockNotificationService();
  });

  describe('GET /api/notifications', () => {
    it('returns notifications list', async () => {
      const app = buildApp(notifications);
      notifications.list.mockResolvedValue({ notifications: [{ id: 'n1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Test', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: '2026-01-01T00:00:00.000Z' }], total: 1 });

      const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.notifications).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('forwards query filters', async () => {
      const app = buildApp(notifications);
      await app.inject({ method: 'GET', url: '/api/notifications?isRead=true&priority=HIGH', headers: authHeaders() });
      expect(notifications.list).toHaveBeenCalledWith('u1', expect.objectContaining({ isRead: true, priority: 'HIGH' }));
    });

    it('forwards isArchived filter', async () => {
      const app = buildApp(notifications);
      await app.inject({ method: 'GET', url: '/api/notifications?isArchived=false', headers: authHeaders() });
      expect(notifications.list).toHaveBeenCalledWith('u1', expect.objectContaining({ isArchived: false }));
    });
  });

  describe('GET /api/notifications/unread', () => {
    it('returns unread count', async () => {
      const app = buildApp(notifications);
      notifications.countUnread.mockResolvedValue(3);

      const res = await app.inject({ method: 'GET', url: '/api/notifications/unread', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).count).toBe(3);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const app = buildApp(notifications);
      notifications.markRead.mockResolvedValue(true);

      const res = await app.inject({ method: 'PATCH', url: '/api/notifications/n1/read', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });

    it('returns 404 if not found', async () => {
      const app = buildApp(notifications);
      notifications.markRead.mockResolvedValue(false);

      const res = await app.inject({ method: 'PATCH', url: '/api/notifications/nope/read', headers: authHeaders() });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('marks all as read', async () => {
      const app = buildApp(notifications);
      notifications.markAllRead.mockResolvedValue(5);

      const res = await app.inject({ method: 'PATCH', url: '/api/notifications/read-all', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).count).toBe(5);
    });
  });

  describe('PATCH /api/notifications/:id/archive', () => {
    it('archives notification', async () => {
      const app = buildApp(notifications);
      notifications.archive.mockResolvedValue(true);

      const res = await app.inject({ method: 'PATCH', url: '/api/notifications/n1/archive', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 if not found', async () => {
      const app = buildApp(notifications);
      notifications.archive.mockResolvedValue(false);

      const res = await app.inject({ method: 'PATCH', url: '/api/notifications/nope/archive', headers: authHeaders() });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('deletes notification', async () => {
      const app = buildApp(notifications);
      notifications.delete.mockResolvedValue(true);

      const res = await app.inject({ method: 'DELETE', url: '/api/notifications/n1', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 if not found', async () => {
      const app = buildApp(notifications);
      notifications.delete.mockResolvedValue(false);

      const res = await app.inject({ method: 'DELETE', url: '/api/notifications/nope', headers: authHeaders() });
      expect(res.statusCode).toBe(404);
    });
  });
});

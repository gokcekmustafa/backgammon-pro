import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminNotificationRoutes } from '../admin-notification-routes';
import type { NotificationService } from '../../notification-service';
import type { ConnectionManager } from '../../connection-manager';
import type { RoomManager } from '../../room-manager';
import type { TableManager } from '../../table-manager';
import { signAccessToken } from '../../lib/jwt';

function mockNotificationService() {
  return {
    createForMultiple: vi.fn(),
    schedule: vi.fn(),
    cancelSchedule: vi.fn(),
  } as unknown as NotificationService;
}

function mockConnections() {
  return { getUserId: vi.fn() } as unknown as ConnectionManager;
}

function mockRooms() {
  return { get: vi.fn() } as unknown as RoomManager;
}

function mockTables() {
  return { get: vi.fn() } as unknown as TableManager;
}

function authHeaders(userId = 'admin1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

function buildApp(
  notifications: NotificationService,
  connections: ConnectionManager,
  rooms: RoomManager,
  tables: TableManager,
) {
  const app = Fastify();

  const prisma = {
    user: {
      findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
        if (id === 'admin1' || id === 'u1') {
          return Promise.resolve({ id, role: 'SUPER_ADMIN' });
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
    },
    auditLog: { create: vi.fn() },
  } as any;

  registerAdminNotificationRoutes(app, prisma, notifications, connections, rooms, tables);
  return app;
}

describe('admin-notification-routes', () => {
  let notifications: ReturnType<typeof mockNotificationService>;
  let connections: ReturnType<typeof mockConnections>;
  let rooms: ReturnType<typeof mockRooms>;
  let tables: ReturnType<typeof mockTables>;

  beforeEach(() => {
    vi.clearAllMocks();
    notifications = mockNotificationService();
    connections = mockConnections();
    rooms = mockRooms();
    tables = mockTables();
  });

  describe('POST /api/admin/notifications/broadcast', () => {
    it('broadcasts to all users', async () => {
      const app = buildApp(notifications, connections, rooms, tables);

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast',
        headers: authHeaders(),
        payload: { type: 'SYSTEM_ANNOUNCEMENT', title: 'Test', priority: 'HIGH' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(2);
      expect(notifications.createForMultiple).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/notifications/broadcast/role', () => {
    it('broadcasts to users by role', async () => {
      const app = buildApp(notifications, connections, rooms, tables);

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast/role',
        headers: authHeaders(),
        payload: { type: 'MAINTENANCE_NOTICE', title: 'Maint', role: 'ADMIN' },
      });

      expect(res.statusCode).toBe(200);
      expect(notifications.createForMultiple).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/notifications/broadcast/room', () => {
    it('broadcasts to users in a room', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      rooms.get = vi.fn().mockReturnValue({ connectionIds: ['c1', 'c2'] });
      connections.getUserId = vi.fn()
        .mockReturnValueOnce('u1')
        .mockReturnValueOnce('u2');

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast/room',
        headers: authHeaders(),
        payload: { type: 'USER_WARNING', title: 'Warning', roomId: 'r1' },
      });

      expect(res.statusCode).toBe(200);
      expect(notifications.createForMultiple).toHaveBeenCalled();
    });

    it('returns 404 if room has no users', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      rooms.get = vi.fn().mockReturnValue({ connectionIds: [] });

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast/room',
        headers: authHeaders(),
        payload: { type: 'USER_WARNING', title: 'Warning', roomId: 'empty' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/admin/notifications/broadcast/table', () => {
    it('broadcasts to users at a table', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      tables.get = vi.fn().mockReturnValue({ connectionIds: ['c1'] });
      connections.getUserId = vi.fn().mockReturnValue('u1');

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast/table',
        headers: authHeaders(),
        payload: { type: 'MATCH_INVITATION', title: 'Game', tableId: 't1' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 if table has no users', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      tables.get = vi.fn().mockReturnValue({ connectionIds: [] });

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/broadcast/table',
        headers: authHeaders(),
        payload: { type: 'MATCH_INVITATION', title: 'Game', tableId: 'empty' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/admin/notifications/schedule', () => {
    it('schedules a notification', async () => {
      const app = buildApp(notifications, connections, rooms, tables);

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/schedule',
        headers: authHeaders(),
        payload: { type: 'SYSTEM_ANNOUNCEMENT', title: 'Future', key: 'test-key', delayMinutes: 30 },
      });

      expect(res.statusCode).toBe(200);
      expect(notifications.schedule).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({ title: 'Future' }),
        30 * 60 * 1000,
      );
    });
  });

  describe('POST /api/admin/notifications/schedule/cancel', () => {
    it('cancels a scheduled notification', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      notifications.cancelSchedule = vi.fn().mockReturnValue(true);

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/schedule/cancel',
        headers: authHeaders(),
        payload: { key: 'test-key' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 if key not found', async () => {
      const app = buildApp(notifications, connections, rooms, tables);
      notifications.cancelSchedule = vi.fn().mockReturnValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/notifications/schedule/cancel',
        headers: authHeaders(),
        payload: { key: 'unknown' },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});

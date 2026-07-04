import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from './notification-service';
import type { Connection } from '../types';

function mockPrisma() {
  return {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as any;
}

function mockConnectionManager() {
  const connections = new Map<string, Connection>();
  const userIdByConnectionId = new Map<string, string>();
  const connectionIdByUserId = new Map<string, string>();

  return {
    getConnectionIdByUserId: vi.fn((uid: string) => connectionIdByUserId.get(uid)),
    get: vi.fn((cid: string) => connections.get(cid)),
    connections,
    userIdByConnectionId,
    connectionIdByUserId,
  } as any;
}

describe('NotificationService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cm: ReturnType<typeof mockConnectionManager>;
  let svc: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    prisma = mockPrisma();
    cm = mockConnectionManager();
    svc = new NotificationService(prisma, cm);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates a notification in db and sends real-time', async () => {
      const now = new Date('2026-01-01');
      const created = { id: 'n1', userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Hello', body: 'Test', priority: 'HIGH', isRead: false, isArchived: false, expiresAt: null, createdAt: now };
      prisma.notification.create.mockResolvedValue(created);

      const send = vi.fn();
      cm.getConnectionIdByUserId.mockReturnValue('c1');
      cm.get.mockReturnValue({ id: 'c1', send, close: vi.fn() });

      const result = await svc.create({ userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Hello', body: 'Test', priority: 'HIGH' });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Hello', body: 'Test', priority: 'HIGH' }),
      });
      expect(result.id).toBe('n1');
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'NOTIFICATION' }));
    });

    it('does not send real-time if user is offline', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n1', userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Hi', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: new Date() });
      cm.getConnectionIdByUserId.mockReturnValue(undefined);

      const result = await svc.create({ userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Hi' });

      expect(result.id).toBe('n1');
      expect(cm.get).not.toHaveBeenCalled();
    });
  });

  describe('createForMultiple', () => {
    it('creates notifications for multiple users', async () => {
      const now = new Date('2026-01-01');
      prisma.notification.createMany.mockResolvedValue({ count: 2 });
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', userId: 'u1', type: 'MAINTENANCE_NOTICE', title: 'Maintenance', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: now },
        { id: 'n2', userId: 'u2', type: 'MAINTENANCE_NOTICE', title: 'Maintenance', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: now },
      ]);

      const results = await svc.createForMultiple([
        { userId: 'u1', type: 'MAINTENANCE_NOTICE', title: 'Maintenance' },
        { userId: 'u2', type: 'MAINTENANCE_NOTICE', title: 'Maintenance' },
      ]);

      expect(results).toHaveLength(2);
    });
  });

  describe('list', () => {
    it('returns paginated notifications', async () => {
      const now = new Date();
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', userId: 'u1', type: 'SYSTEM_ANNOUNCEMENT', title: 'A', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: now },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await svc.list('u1', {});

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by isRead', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      await svc.list('u1', { isRead: true });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', isRead: true } }),
      );
    });

    it('filters by isArchived', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      await svc.list('u1', { isArchived: true });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', isArchived: true } }),
      );
    });

    it('filters by priority', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      await svc.list('u1', { priority: 'HIGH' });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', priority: 'HIGH' } }),
      );
    });
  });

  describe('countUnread', () => {
    it('returns unread count', async () => {
      prisma.notification.count.mockResolvedValue(5);
      const count = await svc.countUnread('u1');
      expect(count).toBe(5);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      const ok = await svc.markRead('n1', 'u1');
      expect(ok).toBe(true);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { isRead: true },
      });
    });

    it('returns false if not found', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      const ok = await svc.markRead('nope', 'u1');
      expect(ok).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('marks all unread as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const count = await svc.markAllRead('u1');
      expect(count).toBe(3);
    });
  });

  describe('delete', () => {
    it('deletes a notification', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });
      const ok = await svc.delete('n1', 'u1');
      expect(ok).toBe(true);
    });

    it('returns false if not found', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
      const ok = await svc.delete('nope', 'u1');
      expect(ok).toBe(false);
    });
  });

  describe('archive', () => {
    it('archives a notification', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      const ok = await svc.archive('n1', 'u1');
      expect(ok).toBe(true);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { isArchived: true },
      });
    });
  });

  describe('schedule / cancelSchedule', () => {
    it('schedules a notification and cancels it', async () => {
      svc.schedule('test-key', { userIds: ['u1', 'u2'], type: 'SYSTEM_ANNOUNCEMENT', title: 'Scheduled' }, 60000);
      const cancelled = svc.cancelSchedule('test-key');
      expect(cancelled).toBe(true);
    });

    it('returns false for unknown schedule key', () => {
      expect(svc.cancelSchedule('unknown')).toBe(false);
    });

    it('fires scheduled notification after delay', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 1 });
      prisma.notification.findMany.mockResolvedValue([]);

      svc.schedule('delayed', { userIds: ['u1'], type: 'SYSTEM_ANNOUNCEMENT', title: 'Delayed' }, 60000);

      vi.advanceTimersByTime(60000);

      expect(prisma.notification.createMany).toHaveBeenCalled();
    });
  });
});

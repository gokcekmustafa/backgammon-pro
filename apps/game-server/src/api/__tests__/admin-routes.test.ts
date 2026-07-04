import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listUsersHandler,
  getUserHandler,
  changeRoleHandler,
  toggleStatusHandler,
  toggleBanHandler,
  deleteUserHandler,
  listBannedUsersHandler,
  listModeratorsHandler,
  toggleModeratorHandler,
  listAuditLogsHandler,
  dashboardHandler,
} from '../admin-routes';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    ...overrides,
  } as any;
}

// ── dashboardHandler ──────────────────────────────────────────────────

describe('dashboardHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard stats', async () => {
    const prisma = {
      user: {
        count: vi.fn(),
      },
    } as any;

    prisma.user.count.mockResolvedValueOnce(100);
    prisma.user.count.mockResolvedValueOnce(3);
    prisma.user.count.mockResolvedValueOnce(5);

    const result = await dashboardHandler(prisma);

    expect(result.status).toBe(200);
    expect(result.body.totalUsers).toBe(100);
    expect(result.body.bannedUsers).toBe(3);
    expect(result.body.newUsersToday).toBe(5);
    expect(result.body.onlineUsers).toBe(0);
    expect(result.body.activeTables).toBe(0);
    expect(result.body.gamesToday).toBe(0);
  });
});

// ── listUsersHandler ────────────────────────────────────────────────────

describe('listUsersHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated users', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-01-01');
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', role: 'USER', isActive: true, bannedAt: null, deletedAt: null, createdAt: now, lastLoginAt: null },
    ]);
    prisma.user.count.mockResolvedValue(1);

    const result = await listUsersHandler(prisma, {});

    expect(result.status).toBe(200);
    expect(result.body.users).toHaveLength(1);
    expect(result.body.total).toBe(1);
    expect(result.body.offset).toBe(0);
    expect(result.body.limit).toBe(20);
  });

  it('filters by search', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { search: 'test' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ username: expect.objectContaining({ contains: 'test' }) }),
          ]),
        }),
      }),
    );
  });

  it('filters by role', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { role: 'MODERATOR' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'MODERATOR' }),
      }),
    );
  });

  it('filters banned users', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { banned: 'true' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bannedAt: { not: null } }),
      }),
    );
  });

  it('filters non-banned users', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { banned: 'false' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bannedAt: null }),
      }),
    );
  });

  it('filters deleted users', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { deleted: 'true' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: { not: null } }),
      }),
    );
  });

  it('respects pagination params', async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listUsersHandler(prisma, { offset: '10', limit: '5' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});

// ── getUserHandler ─────────────────────────────────────────────────────

describe('getUserHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await getUserHandler(prisma, { id: 'bad' });

    expect(result.status).toBe(404);
  });

  it('returns user details', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-01-01');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@t.com',
      username: 'user1',
      displayName: 'User 1',
      role: 'USER',
      isActive: true,
      bannedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      emailVerifiedAt: null,
      profile: null,
      _count: { convertedGuests: 0 },
    });

    const result = await getUserHandler(prisma, { id: 'u1' });

    expect(result.status).toBe(200);
    expect(result.body.id).toBe('u1');
    expect(result.body.email).toBe('a@t.com');
    expect(result.body.role).toBe('USER');
  });

  it('includes profile when present', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-01-01');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@t.com',
      username: 'user1',
      displayName: 'User 1',
      role: 'USER',
      isActive: true,
      bannedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      emailVerifiedAt: null,
      profile: { avatarUrl: 'https://example.com/avatar.png', bio: 'Hello', location: 'US' },
      _count: { convertedGuests: 2 },
    });

    const result = await getUserHandler(prisma, { id: 'u1' });

    expect(result.status).toBe(200);
    expect(result.body.profile.avatarUrl).toBe('https://example.com/avatar.png');
    expect(result.body._count.convertedGuests).toBe(2);
  });
});

// ── changeRoleHandler ──────────────────────────────────────────────────

describe('changeRoleHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await changeRoleHandler(prisma, { id: 'bad' }, { role: 'ADMIN' }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(404);
  });

  it('changes user role and records audit', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', role: 'MODERATOR' });

    const result = await changeRoleHandler(prisma, { id: 'u1' }, { role: 'MODERATOR' }, 'sa1', 'SUPER_ADMIN', '127.0.0.1');

    expect(result.status).toBe(200);
    expect(result.body.user.role).toBe('MODERATOR');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'sa1',
          targetId: 'u1',
          action: 'CHANGE_ROLE',
          ip: '127.0.0.1',
          metadata: expect.objectContaining({ fromRole: 'USER', toRole: 'MODERATOR' }),
        }),
      }),
    );
  });
});

// ── toggleStatusHandler ────────────────────────────────────────────────

describe('toggleStatusHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await toggleStatusHandler(prisma, { id: 'bad' }, { isActive: false }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(404);
  });

  it('disables user and records audit', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', isActive: false });

    const result = await toggleStatusHandler(prisma, { id: 'u1' }, { isActive: false }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.isActive).toBe(false);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DISABLE' }),
      }),
    );
  });

  it('enables user and records audit', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', isActive: true });

    const result = await toggleStatusHandler(prisma, { id: 'u1' }, { isActive: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.isActive).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ENABLE' }),
      }),
    );
  });
});

// ── toggleBanHandler ───────────────────────────────────────────────────

describe('toggleBanHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await toggleBanHandler(prisma, { id: 'bad' }, { banned: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(404);
  });

  it('bans user and records audit', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', bannedAt: null });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', bannedAt: new Date('2026-06-01') });

    const result = await toggleBanHandler(prisma, { id: 'u1' }, { banned: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.bannedAt).not.toBeNull();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'BAN' }),
      }),
    );
  });

  it('unbans user and records audit', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', bannedAt: new Date('2026-06-01') });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', bannedAt: null });

    const result = await toggleBanHandler(prisma, { id: 'u1' }, { banned: false }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.bannedAt).toBeNull();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'UNBAN' }),
      }),
    );
  });
});

// ── deleteUserHandler ──────────────────────────────────────────────────

describe('deleteUserHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await deleteUserHandler(prisma, { id: 'bad' }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(404);
  });

  it('returns 409 when user already deleted', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date('2026-06-01') });

    const result = await deleteUserHandler(prisma, { id: 'u1' }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('User is already deleted');
  });

  it('soft deletes user and marks inactive', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', deletedAt: new Date('2026-07-01') });

    const result = await deleteUserHandler(prisma, { id: 'u1' }, 'sa1', 'SUPER_ADMIN', '127.0.0.1');

    expect(result.status).toBe(200);
    expect(result.body.user.deletedAt).not.toBeNull();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DELETE', actorId: 'sa1', targetId: 'u1', ip: '127.0.0.1' }),
      }),
    );
  });
});

// ── listBannedUsersHandler ─────────────────────────────────────────────

describe('listBannedUsersHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns banned users ordered by bannedAt desc', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-06-01');
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', bannedAt: now },
    ]);

    const result = await listBannedUsersHandler(prisma);

    expect(result.status).toBe(200);
    expect(result.body.users).toHaveLength(1);
    expect(result.body.users[0].bannedAt).toBe(now.toISOString());
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bannedAt: { not: null }, deletedAt: null },
        orderBy: { bannedAt: 'desc' },
      }),
    );
  });
});

// ── listModeratorsHandler ──────────────────────────────────────────────

describe('listModeratorsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns moderators, admins, and super admins', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-01-01');
    prisma.user.findMany.mockResolvedValue([
      { id: 'm1', email: 'm@t.com', username: 'mod1', displayName: 'Mod 1', role: 'MODERATOR', createdAt: now },
    ]);

    const result = await listModeratorsHandler(prisma);

    expect(result.status).toBe(200);
    expect(result.body.users).toHaveLength(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] },
        }),
      }),
    );
  });
});

// ── toggleModeratorHandler ─────────────────────────────────────────────

describe('toggleModeratorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await toggleModeratorHandler(prisma, { id: 'bad' }, { promote: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(404);
  });

  it('returns 409 when promoting an already moderator', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'MODERATOR' });

    const result = await toggleModeratorHandler(prisma, { id: 'u1' }, { promote: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('User is already a moderator');
  });

  it('returns 409 when demoting a non-moderator', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });

    const result = await toggleModeratorHandler(prisma, { id: 'u1' }, { promote: false }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('User is not a moderator');
  });

  it('returns 409 when attempting to change admin via moderator endpoint', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', role: 'ADMIN' });

    const result = await toggleModeratorHandler(prisma, { id: 'a1' }, { promote: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('Cannot change role of admins via moderator endpoint');
  });

  it('promotes user to moderator', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', role: 'MODERATOR' });

    const result = await toggleModeratorHandler(prisma, { id: 'u1' }, { promote: true }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.role).toBe('MODERATOR');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PROMOTE_MODERATOR' }),
      }),
    );
  });

  it('demotes moderator to user', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'MODERATOR' });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'a@t.com', username: 'user1', displayName: 'User 1', role: 'USER' });

    const result = await toggleModeratorHandler(prisma, { id: 'u1' }, { promote: false }, 'sa1', 'SUPER_ADMIN');

    expect(result.status).toBe(200);
    expect(result.body.user.role).toBe('USER');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DEMOTE_MODERATOR' }),
      }),
    );
  });
});

// ── listAuditLogsHandler ──────────────────────────────────────────────

describe('listAuditLogsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated audit logs with actor/target info', async () => {
    const prisma = {
      auditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    } as any;

    const now = new Date('2026-07-01');
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log1', actorId: 'sa1', actorRole: 'SUPER_ADMIN', targetId: 'u1', action: 'BAN', ip: '127.0.0.1', metadata: {}, createdAt: now },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 'sa1', username: 'admin', displayName: 'Admin' },
      { id: 'u1', username: 'user1', displayName: 'User 1' },
    ]);

    const result = await listAuditLogsHandler(prisma, {});

    expect(result.status).toBe(200);
    expect(result.body.logs).toHaveLength(1);
    expect(result.body.total).toBe(1);
    expect(result.body.logs[0].action).toBe('BAN');
    expect(result.body.logs[0].actor.displayName).toBe('Admin');
    expect(result.body.logs[0].target.displayName).toBe('User 1');
    expect(result.body.logs[0].ip).toBe('127.0.0.1');
  });

  it('handles logs without target', async () => {
    const prisma = {
      auditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    } as any;

    const now = new Date('2026-07-01');
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log1', actorId: 'sa1', actorRole: 'SUPER_ADMIN', targetId: null, action: 'LOGIN', ip: null, metadata: {}, createdAt: now },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 'sa1', username: 'admin', displayName: 'Admin' },
    ]);

    const result = await listAuditLogsHandler(prisma, {});

    expect(result.status).toBe(200);
    expect(result.body.logs[0].target).toBeNull();
    expect(result.body.logs[0].ip).toBeNull();
  });

  it('returns null for unknown actors', async () => {
    const prisma = {
      auditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    } as any;

    const now = new Date('2026-07-01');
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log1', actorId: 'unknown', actorRole: 'USER', targetId: null, action: 'TEST', ip: null, metadata: {}, createdAt: now },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await listAuditLogsHandler(prisma, {});

    expect(result.status).toBe(200);
    expect(result.body.logs[0].actor).toBeNull();
  });
});

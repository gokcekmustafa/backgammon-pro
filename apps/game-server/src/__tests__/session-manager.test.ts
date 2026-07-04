import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from '../session-manager';
import type { PrismaClient } from '@backgammon/database';
import type { SecurityService } from '../security-service';
import { signRefreshToken } from '../lib/jwt';

function mockPrisma() {
  const sessionCreate = vi.fn().mockResolvedValue({ id: 's1' });
  const sessionFindMany = vi.fn().mockResolvedValue([]);
  const sessionFindFirst = vi.fn().mockResolvedValue(null);
  const sessionUpdate = vi.fn().mockResolvedValue({});
  const sessionUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const sessionDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
  const sessionCount = vi.fn().mockResolvedValue(0);
  const userFindUnique = vi.fn().mockResolvedValue({ id: 'u1' });
  const guestUserFindUnique = vi.fn().mockResolvedValue(null);

  return {
    session: {
      create: sessionCreate,
      findMany: sessionFindMany,
      findFirst: sessionFindFirst,
      update: sessionUpdate,
      updateMany: sessionUpdateMany,
      deleteMany: sessionDeleteMany,
      count: sessionCount,
    },
    user: { findUnique: userFindUnique },
    guestUser: { findUnique: guestUserFindUnique },
  } as unknown as PrismaClient;
}

function mockSecurity(): SecurityService {
  return { log: vi.fn().mockResolvedValue(undefined) } as any;
}

describe('SessionManager', () => {
  let prisma: PrismaClient;
  let security: SecurityService;
  let sessions: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma();
    security = mockSecurity();
    sessions = new SessionManager(prisma, security, 5);
  });

  describe('createSession', () => {
    it('creates a session and returns tokens', async () => {
      const tokens = await sessions.createSession('user', 'u1', { ip: '127.0.0.1', userAgent: 'test' });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });
  });

  describe('refreshSession', () => {
    it('returns null for invalid token', async () => {
      const result = await sessions.refreshSession('invalid-token');
      expect(result).toBeNull();
    });

    it('returns null when no matching session found', async () => {
      const prisma2 = mockPrisma();
      (prisma2.session.findMany as any).mockResolvedValue([]);
      const mgr = new SessionManager(prisma2, security, 5);

      const token = signRefreshToken({ sub: 'u1', sessionId: 's1' });
      const result = await mgr.refreshSession(token);
      expect(result).toBeNull();
    });
  });

  describe('revokeSession', () => {
    it('returns false for invalid token', async () => {
      const result = await sessions.revokeSession('invalid');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('deletes expired sessions', async () => {
      const count = await sessions.cleanupExpiredSessions();
      expect(count).toBe(1);
    });
  });
});
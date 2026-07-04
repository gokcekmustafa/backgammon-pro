import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAuthRoutes } from './routes';
import type { SessionManager } from '../session-manager';
import type { SecurityService } from '../security-service';

vi.mock('../lib/password', () => ({
  hashPassword: vi.fn((s: string) => Promise.resolve(`hashed_${s}`)),
  comparePassword: vi.fn((pw: string, hash: string) => Promise.resolve(hash === `hashed_${pw}`)),
}));

vi.mock('../lib/jwt', () => ({
  signAccessToken: vi.fn(() => 'access_token'),
  signRefreshToken: vi.fn(() => 'refresh_token'),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'valid_access') return { sub: 'u1', type: 'user' as const };
    throw new Error('Invalid token');
  }),
  verifyRefreshToken: vi.fn((token: string) => {
    if (token === 'valid_refresh') return { sub: 'user_1', sessionId: 'sess_1' };
    throw new Error('Invalid token');
  }),
}));

function mockSessionManager(): SessionManager {
  return {
    createSession: vi.fn().mockResolvedValue({ accessToken: 'access_token', refreshToken: 'refresh_token' }),
    refreshSession: vi.fn().mockResolvedValue({ accessToken: 'new_access', refreshToken: 'new_refresh' }),
    revokeSession: vi.fn().mockResolvedValue(true),
    revokeAllUserSessions: vi.fn().mockResolvedValue(),
    getUserSessions: vi.fn().mockResolvedValue([]),
    getActiveSessionCount: vi.fn().mockResolvedValue(1),
    cleanupExpiredSessions: vi.fn().mockResolvedValue(0),
  } as unknown as SessionManager;
}

function mockSecurity(): SecurityService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
    getEvents: vi.fn().mockResolvedValue({ events: [], total: 0 }),
    countByType: vi.fn().mockResolvedValue(0),
    countByUser: vi.fn().mockResolvedValue(0),
    getSummary: vi.fn().mockResolvedValue({ failedLogins24h: 0, tokenAbuse24h: 0, cheatAttempts24h: 0, rateLimitViolations24h: 0, totalEvents24h: 0 }),
  } as unknown as SecurityService;
}

function buildApp(sessions: SessionManager, security: SecurityService) {
  const app = Fastify();
  const prisma = {
    user: { findUnique: vi.fn() },
    guestUser: { create: vi.fn() },
  };
  registerAuthRoutes(app, prisma as any, sessions, security);
  return app;
}

describe('auth routes', () => {
  let sessions: SessionManager;
  let security: SecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    sessions = mockSessionManager();
    security = mockSecurity();
  });

  describe('POST /auth/login', () => {
    it('returns 400 if email or password missing', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/login', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 401 for invalid credentials', async () => {
      const app = buildApp(sessions, security);
      const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
      const app2 = Fastify();
      registerAuthRoutes(app2, prisma as any, sessions, security);
      const res = await app2.inject({ method: 'POST', url: '/auth/login', payload: { email: 'test@test.com', password: 'wrong' } });
      expect(res.statusCode).toBe(401);
    });

    it('returns tokens on successful login', async () => {
      const prisma = {
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com', passwordHash: 'hashed_pass', username: 'test', displayName: 'Test' }) },
      };
      const app = Fastify();
      registerAuthRoutes(app, prisma as any, sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'test@test.com', password: 'pass' } });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.accessToken).toBe('access_token');
      expect(body.user).toBeDefined();
    });
  });

  describe('POST /auth/guest-login', () => {
    it('creates guest session', async () => {
      const prisma = { guestUser: { create: vi.fn().mockResolvedValue({ id: 'g1', displayName: 'Guest' }) } };
      const app = Fastify();
      registerAuthRoutes(app, prisma as any, sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/guest-login', payload: {} });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.accessToken).toBe('access_token');
      expect(body.guest).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 400 if token missing', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns new tokens on valid refresh', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: 'valid_refresh' } });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.accessToken).toBe('new_access');
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 on logout', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: 'valid_refresh' } });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /auth/sessions', () => {
    it('returns user sessions', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'GET', url: '/auth/sessions', headers: { authorization: 'Bearer valid_access' } });
      expect(res.statusCode).toBe(200);
    });

    it('returns 401 without auth', async () => {
      const app = buildApp(sessions, security);
      const res = await app.inject({ method: 'GET', url: '/auth/sessions' });
      expect(res.statusCode).toBe(401);
    });
  });
});
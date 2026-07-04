import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminSecurityRoutes } from '../admin-security-routes';
import type { SecurityService } from '../../security-service';
import type { SessionManager } from '../../session-manager';
import type { RateLimiter } from '../../rate-limiter';
import type { MonitoringService } from '../../monitoring-service';
import { signAccessToken } from '../../lib/jwt';

function mockServices() {
  return {
    security: {
      getSummary: vi.fn().mockResolvedValue({ failedLogins24h: 5, tokenAbuse24h: 2, cheatAttempts24h: 1, rateLimitViolations24h: 10, totalEvents24h: 100 }),
      getEvents: vi.fn().mockResolvedValue({ events: [], total: 0 }),
    } as unknown as SecurityService,
    sessions: {
      getUserSessions: vi.fn().mockResolvedValue([]),
      revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionManager,
    rateLimiter: {
      getStats: vi.fn().mockReturnValue({ globalCount: 10, userBuckets: 5, ipBuckets: 3 }),
      resetUser: vi.fn(),
    } as unknown as RateLimiter,
    monitoring: {
      getMetrics: vi.fn().mockResolvedValue({
        timestamp: '', uptime: 100, memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
        cpu: { user: 0, system: 0 },
        connections: { activeUsers: 10, totalConnections: 20, authenticatedConnections: 15 },
        games: { activeGames: 5, finishedGamesToday: 50 },
        rateLimiter: { globalCount: 10, userBuckets: 5, ipBuckets: 3 },
        cache: { size: 0, hitRatio: 0 },
        database: { connected: true, responseTimeMs: 1 },
        responseTimes: { average: 10, p95: 50, p99: 100 },
        eventLoop: { lagMs: 0 },
      }),
    } as unknown as MonitoringService,
  };
}

function buildApp(services: ReturnType<typeof mockServices>) {
  const app = Fastify();
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin1', role: 'SUPER_ADMIN' }) },
  };
  registerAdminSecurityRoutes(app, prisma as any, services.security, services.sessions, services.rateLimiter, services.monitoring);
  return app;
}

function adminHeaders() {
  const token = signAccessToken({ sub: 'admin1', type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('admin-security-routes', () => {
  let services: ReturnType<typeof mockServices>;

  beforeEach(() => {
    vi.clearAllMocks();
    services = mockServices();
  });

  it('GET /api/admin/security/summary returns dashboard data', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/security/summary', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.failedLogins24h).toBe(5);
    expect(body.connections.activeUsers).toBe(10);
    expect(body.games.activeGames).toBe(5);
  });

  it('GET /api/admin/security/events returns events', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/security/events', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/admin/security/events filters by eventType', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/security/events?eventType=FAILED_LOGIN', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/admin/security/online returns online users', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/security/online', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.onlineUsers).toBe(10);
  });

  it('GET /api/admin/metrics returns metrics', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/metrics', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/admin/security/rate-limiter returns stats', async () => {
    const app = buildApp(services);
    const res = await app.inject({ method: 'GET', url: '/api/admin/security/rate-limiter', headers: adminHeaders() });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.globalCount).toBe(10);
  });
});
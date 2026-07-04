import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminSubscriptionRoutes } from '../admin-subscription-routes';
import type { SubscriptionService } from '../../subscription-service';
import { signAccessToken } from '../../lib/jwt';

function mockSubService() {
  return {
    listAllSubscriptions: vi.fn(),
    listAllPayments: vi.fn(),
    changePlan: vi.fn(),
    cancelSubscription: vi.fn(),
    extendSubscription: vi.fn(),
  } as unknown as SubscriptionService;
}

function authHeaders(userId = 'admin1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('admin-subscription-routes', () => {
  let subs: ReturnType<typeof mockSubService>;

  beforeEach(() => {
    vi.clearAllMocks();
    subs = mockSubService();
  });

  function buildApp() {
    const app = Fastify();
    const prisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
          if (id === 'admin1') return Promise.resolve({ id: 'admin1', role: 'SUPER_ADMIN' });
          return Promise.resolve(null);
        }),
      },
      auditLog: { create: vi.fn() },
    } as any;
    registerAdminSubscriptionRoutes(app, prisma, subs);
    return app;
  }

  describe('GET /api/admin/subscriptions', () => {
    it('lists subscriptions', async () => {
      const app = buildApp();
      subs.listAllSubscriptions.mockResolvedValue({ subscriptions: [], total: 0 });

      const res = await app.inject({ method: 'GET', url: '/api/admin/subscriptions', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/admin/payments', () => {
    it('lists payments', async () => {
      const app = buildApp();
      subs.listAllPayments.mockResolvedValue({ payments: [], total: 0 });

      const res = await app.inject({ method: 'GET', url: '/api/admin/payments', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/admin/subscriptions/:id/plan', () => {
    it('changes plan', async () => {
      const app = buildApp();
      subs.changePlan.mockResolvedValue({ id: 's1', planType: 'VIP', planName: 'VIP', status: 'active', startedAt: '2026-01-01T00:00:00.000Z', expiresAt: null, autoRenew: true, provider: null });

      const res = await app.inject({
        method: 'PUT', url: '/api/admin/subscriptions/u1/plan', headers: authHeaders(),
        payload: { planType: 'VIP' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).planType).toBe('VIP');
    });

    it('returns 400 on error', async () => {
      const app = buildApp();
      subs.changePlan.mockRejectedValue(new Error('Plan not found'));

      const res = await app.inject({
        method: 'PUT', url: '/api/admin/subscriptions/u1/plan', headers: authHeaders(),
        payload: { planType: 'FAKE' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/admin/subscriptions/:id/cancel', () => {
    it('cancels subscription', async () => {
      const app = buildApp();
      subs.cancelSubscription.mockResolvedValue({ id: 's1', planType: 'PREMIUM', planName: 'Premium', status: 'cancelled', startedAt: '2026-01-01T00:00:00.000Z', expiresAt: null, autoRenew: false, provider: null });

      const res = await app.inject({ method: 'POST', url: '/api/admin/subscriptions/u1/cancel', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 on error', async () => {
      const app = buildApp();
      subs.cancelSubscription.mockRejectedValue(new Error('No active subscription'));

      const res = await app.inject({ method: 'POST', url: '/api/admin/subscriptions/u1/cancel', headers: authHeaders() });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/admin/subscriptions/:id/extend', () => {
    it('extends subscription', async () => {
      const app = buildApp();
      subs.extendSubscription.mockResolvedValue({ id: 's1', planType: 'PREMIUM', planName: 'Premium', status: 'active', startedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-03-01T00:00:00.000Z', autoRenew: true, provider: null });

      const res = await app.inject({
        method: 'POST', url: '/api/admin/subscriptions/u1/extend', headers: authHeaders(),
        payload: { days: 30 },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

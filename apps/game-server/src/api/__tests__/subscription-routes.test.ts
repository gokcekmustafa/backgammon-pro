import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerSubscriptionRoutes } from '../subscription-routes';
import type { SubscriptionService } from '../../subscription-service';
import { signAccessToken } from '../../lib/jwt';

function mockSubService() {
  return {
    getPlans: vi.fn(),
    getUserSubscription: vi.fn(),
    getPaymentHistory: vi.fn(),
  } as unknown as SubscriptionService;
}

function authHeaders(userId = 'u1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('subscription-routes', () => {
  let subs: ReturnType<typeof mockSubService>;

  beforeEach(() => {
    vi.clearAllMocks();
    subs = mockSubService();
  });

  function buildApp() {
    const app = Fastify();
    registerSubscriptionRoutes(app, {} as any, subs);
    return app;
  }

  describe('GET /api/subscription/plans', () => {
    it('returns plans', async () => {
      const app = buildApp();
      subs.getPlans.mockResolvedValue([{ id: 'p1', planType: 'FREE', name: 'Free', description: null, price: 0, currency: 'USD', durationDays: 0, features: null, sortOrder: 0 }]);

      const res = await app.inject({ method: 'GET', url: '/api/subscription/plans' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).plans).toHaveLength(1);
    });
  });

  describe('GET /api/subscription', () => {
    it('returns user subscription', async () => {
      const app = buildApp();
      subs.getUserSubscription.mockResolvedValue({ id: 's1', planType: 'PREMIUM', planName: 'Premium', status: 'active', startedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-02-01T00:00:00.000Z', autoRenew: true, provider: null });

      const res = await app.inject({ method: 'GET', url: '/api/subscription', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).subscription.planType).toBe('PREMIUM');
    });

    it('returns null if no subscription', async () => {
      const app = buildApp();
      subs.getUserSubscription.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/subscription', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).subscription).toBeNull();
    });
  });

  describe('GET /api/subscription/history', () => {
    it('returns payment history', async () => {
      const app = buildApp();
      subs.getPaymentHistory.mockResolvedValue([{ id: 'pay1', amount: 9.99, currency: 'USD', provider: 'stripe', status: 'completed', description: null, paidAt: null, createdAt: '2026-01-01T00:00:00.000Z' }]);

      const res = await app.inject({ method: 'GET', url: '/api/subscription/history', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).payments).toHaveLength(1);
    });
  });
});

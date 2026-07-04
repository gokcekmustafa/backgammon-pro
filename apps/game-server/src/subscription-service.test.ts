import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from './subscription-service';
import { ManualPaymentProvider } from './payment-provider';

function mockPrisma() {
  return {
    subscriptionPlan: { findMany: vi.fn(), findUnique: vi.fn() },
    subscription: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}), count: vi.fn() },
    payment: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
  } as any;
}

describe('SubscriptionService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma();
    svc = new SubscriptionService(prisma, new ManualPaymentProvider());
  });

  describe('getPlans', () => {
    it('returns active plans sorted by sortOrder', async () => {
      prisma.subscriptionPlan.findMany.mockResolvedValue([
        { id: 'p1', planType: 'FREE', name: 'Free', description: null, price: 0, currency: 'USD', durationDays: 0, features: null, sortOrder: 0 },
        { id: 'p2', planType: 'PREMIUM', name: 'Premium', description: 'Premium', price: 9.99, currency: 'USD', durationDays: 30, features: {}, sortOrder: 1 },
      ]);
      const plans = await svc.getPlans();
      expect(plans).toHaveLength(2);
      expect(plans[0].planType).toBe('FREE');
      expect(plans[1].price).toBe(9.99);
    });
  });

  describe('getUserSubscription', () => {
    it('returns null if no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      const result = await svc.getUserSubscription('u1');
      expect(result).toBeNull();
    });

    it('returns subscription info', async () => {
      const farFuture = new Date(Date.now() + 365 * 86400000);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date(), expiresAt: farFuture,
        autoRenew: true, provider: 'stripe', plan: { planType: 'PREMIUM', name: 'Premium' },
      });
      const result = await svc.getUserSubscription('u1');
      expect(result?.planType).toBe('PREMIUM');
      expect(result?.status).toBe('active');
    });
  });

  describe('getPaymentHistory', () => {
    it('returns payments ordered by date desc', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay1', amount: 9.99, currency: 'USD', provider: 'stripe', status: 'completed', description: 'Test', paidAt: new Date('2026-01-01'), createdAt: new Date('2026-01-01') },
      ]);
      const payments = await svc.getPaymentHistory('u1');
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(9.99);
    });
  });

  describe('changePlan', () => {
    it('creates new subscription if none exists', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1', planType: 'PREMIUM', name: 'Premium', price: 9.99, currency: 'USD', durationDays: 30 });
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000),
        autoRenew: true, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' },
      });

      const result = await svc.changePlan('u1', 'PREMIUM', 'admin', 'SUPER_ADMIN');
      expect(result.planType).toBe('PREMIUM');
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('upgrades existing subscription', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p2', planType: 'VIP', name: 'VIP', price: 19.99, currency: 'USD', durationDays: 30 });
      prisma.subscription.findUnique.mockResolvedValue({ id: 's1', status: 'active', planType: 'PREMIUM' });
      prisma.subscription.update.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000),
        autoRenew: true, provider: null, plan: { planType: 'VIP', name: 'VIP' },
      });

      const result = await svc.changePlan('u1', 'VIP', 'admin', 'SUPER_ADMIN');
      expect(result.planType).toBe('VIP');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('throws on unknown plan', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      await expect(svc.changePlan('u1', 'VIP' as any, 'admin', 'SUPER_ADMIN')).rejects.toThrow('Plan not found');
    });
  });

  describe('cancelSubscription', () => {
    it('cancels active subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date(), expiresAt: new Date(),
        autoRenew: true, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' },
      });
      prisma.subscription.update.mockResolvedValue({
        id: 's1', status: 'cancelled', startedAt: new Date(), expiresAt: new Date(),
        autoRenew: false, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' },
      });

      const result = await svc.cancelSubscription('u1', 'admin', 'SUPER_ADMIN');
      expect(result.status).toBe('cancelled');
      expect(result.autoRenew).toBe(false);
    });

    it('throws if no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(svc.cancelSubscription('u1', 'admin', 'SUPER_ADMIN')).rejects.toThrow('No active subscription');
    });
  });

  describe('extendSubscription', () => {
    it('extends subscription expiry', async () => {
      const now = new Date('2026-01-15');
      vi.setSystemTime(now);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date('2026-01-01'), expiresAt: new Date('2026-02-01'),
        autoRenew: true, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' },
      });
      prisma.subscription.update.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date('2026-01-01'), expiresAt: new Date('2026-03-03'),
        autoRenew: true, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' },
      });

      const result = await svc.extendSubscription('u1', 30, 'admin', 'SUPER_ADMIN');
      expect(result.status).toBe('active');
      expect(prisma.subscription.update).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('throws if no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(svc.extendSubscription('u1', 30, 'admin', 'SUPER_ADMIN')).rejects.toThrow('No subscription');
    });
  });

  describe('listAllSubscriptions', () => {
    it('returns paginated subscriptions', async () => {
      const farFuture = new Date(Date.now() + 365 * 86400000);
      prisma.subscription.findMany.mockResolvedValue([
        { id: 's1', status: 'active', startedAt: new Date(), expiresAt: farFuture, autoRenew: true, provider: null, plan: { planType: 'PREMIUM', name: 'Premium' } },
      ]);
      prisma.subscription.count.mockResolvedValue(1);

      const result = await svc.listAllSubscriptions();
      expect(result.subscriptions).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('listAllPayments', () => {
    it('returns paginated payments', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay1', amount: 9.99, currency: 'USD', provider: 'stripe', status: 'completed', description: null, paidAt: null, createdAt: new Date() },
      ]);
      prisma.payment.count.mockResolvedValue(1);

      const result = await svc.listAllPayments();
      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});

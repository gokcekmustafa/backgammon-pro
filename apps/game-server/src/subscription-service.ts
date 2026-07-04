import type { PrismaClient, SubscriptionPlanType, SubscriptionStatus, PaymentStatus } from '@backgammon/database';
import type { PaymentProvider } from './payment-provider';
import { ManualPaymentProvider } from './payment-provider';

export interface SubscriptionInfo {
  id: string;
  planType: SubscriptionPlanType;
  planName: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  provider: string | null;
}

export interface PlanInfo {
  id: string;
  planType: SubscriptionPlanType;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number;
  features: Record<string, unknown> | null;
  sortOrder: number;
}

export interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

function subToInfo(s: {
  id: string; status: SubscriptionStatus; startedAt: Date; expiresAt: Date | null;
  autoRenew: boolean; provider: string | null; plan: { planType: SubscriptionPlanType; name: string };
}): SubscriptionInfo {
  return {
    id: s.id, planType: s.plan.planType, planName: s.plan.name, status: s.status,
    startedAt: s.startedAt.toISOString(), expiresAt: s.expiresAt?.toISOString() ?? null,
    autoRenew: s.autoRenew, provider: s.provider,
  };
}

export class SubscriptionService {
  private provider: PaymentProvider;

  constructor(
    private prisma: PrismaClient,
    provider?: PaymentProvider,
  ) {
    this.provider = provider ?? new ManualPaymentProvider();
  }

  setProvider(provider: PaymentProvider): void {
    this.provider = provider;
  }

  async getPlans(): Promise<PlanInfo[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map((p) => ({
      id: p.id, planType: p.planType, name: p.name, description: p.description,
      price: Number(p.price), currency: p.currency, durationDays: p.durationDays,
      features: p.features as Record<string, unknown> | null, sortOrder: p.sortOrder,
    }));
  }

  async getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { planType: true, name: true } } },
    });
    if (!sub) return null;
    this.checkExpiry(sub);
    return subToInfo(sub);
  }

  async getPaymentHistory(userId: string, limit = 20): Promise<PaymentInfo[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return payments.map((p) => ({
      id: p.id, amount: Number(p.amount), currency: p.currency,
      provider: p.provider, status: p.status, description: p.description,
      paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
    }));
  }

  async changePlan(
    userId: string,
    newPlanType: SubscriptionPlanType,
    actorId: string,
    actorRole: string,
    ip?: string,
  ): Promise<SubscriptionInfo> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { planType: newPlanType } });
    if (!plan) throw new Error(`Plan not found: ${newPlanType}`);

    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    const now = new Date();

    let sub;
    if (existing) {
      sub = await this.prisma.subscription.update({
        where: { userId },
        data: {
          planId: plan.id,
          status: 'active',
          startedAt: now,
          expiresAt: plan.durationDays > 0 ? new Date(now.getTime() + plan.durationDays * 86400000) : null,
          cancelledAt: null,
          autoRenew: plan.planType !== 'FREE',
        },
        include: { plan: { select: { planType: true, name: true } } },
      });
    } else {
      sub = await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: 'active',
          startedAt: now,
          expiresAt: plan.durationDays > 0 ? new Date(now.getTime() + plan.durationDays * 86400000) : null,
          autoRenew: plan.planType !== 'FREE',
        },
        include: { plan: { select: { planType: true, name: true } } },
      });
    }

    await this.prisma.payment.create({
      data: {
        subscriptionId: sub.id,
        userId,
        amount: plan.price,
        currency: plan.currency,
        provider: 'manual',
        status: 'completed',
        description: `Plan change to ${plan.name}`,
        paidAt: now,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId, actorRole: actorRole as any, targetId: userId,
        action: 'CHANGE_SUBSCRIPTION', ip, metadata: { newPlan: newPlanType, previousPlan: existing ? existing.status : null },
      },
    });

    return subToInfo(sub);
  }

  async cancelSubscription(userId: string, actorId: string, actorRole: string, ip?: string): Promise<SubscriptionInfo> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { planType: true, name: true } } },
    });
    if (!sub) throw new Error('No active subscription');
    if (sub.status !== 'active') throw new Error('Subscription is not active');

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'cancelled', cancelledAt: new Date(), autoRenew: false },
      include: { plan: { select: { planType: true, name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId, actorRole: actorRole as any, targetId: userId,
        action: 'CANCEL_SUBSCRIPTION', ip, metadata: { planType: sub.plan.planType },
      },
    });

    return subToInfo(updated);
  }

  async extendSubscription(userId: string, days: number, actorId: string, actorRole: string, ip?: string): Promise<SubscriptionInfo> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { planType: true, name: true } } },
    });
    if (!sub) throw new Error('No subscription found');

    const currentExpiry = sub.expiresAt ?? new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 86400000);

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        expiresAt: newExpiry,
        status: 'active',
      },
      include: { plan: { select: { planType: true, name: true } } },
    });

    await this.prisma.payment.create({
      data: {
        subscriptionId: sub.id, userId,
        amount: 0, currency: 'USD', provider: 'manual', status: 'completed',
        description: `Admin extension: +${days} days`, paidAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId, actorRole: actorRole as any, targetId: userId,
        action: 'EXTEND_SUBSCRIPTION', ip, metadata: { days, previousExpiry: sub.expiresAt?.toISOString(), newExpiry: newExpiry.toISOString() },
      },
    });

    return subToInfo(updated);
  }

  async listAllSubscriptions(offset = 0, limit = 20): Promise<{ subscriptions: SubscriptionInfo[]; total: number }> {
    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 100),
        include: { plan: { select: { planType: true, name: true } } },
      }),
      this.prisma.subscription.count(),
    ]);
    return {
      subscriptions: subs.map((s) => { this.checkExpiry(s); return subToInfo(s); }),
      total,
    };
  }

  async listAllPayments(offset = 0, limit = 20): Promise<{ payments: PaymentInfo[]; total: number }> {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 100),
      }),
      this.prisma.payment.count(),
    ]);
    return {
      payments: payments.map((p) => ({
        id: p.id, amount: Number(p.amount), currency: p.currency,
        provider: p.provider, status: p.status, description: p.description,
        paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
      })),
      total,
    };
  }

  private checkExpiry(sub: { status: SubscriptionStatus; expiresAt: Date | null; autoRenew: boolean }): void {
    if (sub.status !== 'active') return;
    if (!sub.expiresAt) return;
    if (sub.expiresAt < new Date()) {
      this.prisma.subscription.update({
        where: { userId: (sub as any).userId },
        data: { status: 'expired' },
      }).catch(() => {});
    }
  }
}
